"use client";

import type { DiffOnMount, OnMount } from "@monaco-editor/react";
import { DiffEditor, Editor } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HOSTFUNC_HOVER_DOCS, HOSTFUNC_TYPES_DTS, type SdkHoverDoc } from "./hostfunc-types";

interface Props {
  value: string;
  packageNames: string[];
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

type Monaco = Parameters<OnMount>[1];

const TYPE_LIST_URL = "https://data.jsdelivr.com/v1/package/npm";
const TYPE_CDN_URL = "https://cdn.jsdelivr.net/npm";
const INTERNAL_MODULES = new Set([
  "@hostfunc/fn",
  "@hostfunc/sdk",
  "@hostfunc/sdk/ai",
  "@hostfunc/sdk/agent",
  "@hostfunc/sdk/vector",
]);

function toDefinitelyTypedName(packageName: string): string {
  if (packageName.startsWith("@")) {
    const [scope, name] = packageName.split("/");
    if (!scope || !name) return `@types/${packageName.replace("@", "").replace("/", "__")}`;
    return `@types/${scope.slice(1)}__${name}`;
  }
  return `@types/${packageName}`;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function addTypePackageLibs(monaco: Monaco, packageName: string, loadedLibs: Set<string>): Promise<boolean> {
  const typePackage = toDefinitelyTypedName(packageName);
  const meta = await fetchJson<{ tags?: { latest?: string } }>(
    `${TYPE_LIST_URL}/${typePackage}`,
  );
  const version = meta?.tags?.latest;
  if (!version) return false;

  const flat = await fetchJson<{ files?: Array<{ name: string }> }>(
    `${TYPE_LIST_URL}/${typePackage}@${version}/flat`,
  );
  const paths = (flat?.files ?? [])
    .map((file) => file.name)
    .filter((name) => name.endsWith(".d.ts"))
    .map((name) => (name.startsWith("/") ? name.slice(1) : name));
  if (paths.length === 0) return false;

  await Promise.all(
    paths.map(async (path) => {
      const libKey = `${typePackage}:${path}`;
      if (loadedLibs.has(libKey)) return;
      const libSource = await fetchText(`${TYPE_CDN_URL}/${typePackage}@${version}/${path}`);
      if (!libSource) return;
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        libSource,
        `file:///node_modules/${typePackage}/${path}`,
      );
      loadedLibs.add(libKey);
    }),
  );
  return true;
}

function addFallbackModuleDeclaration(monaco: Monaco, packageName: string, loadedLibs: Set<string>) {
  const libKey = `fallback:${packageName}`;
  if (loadedLibs.has(libKey)) return;
  const decl = `declare module "${packageName}" { const value: any; export default value; }\n`;
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    decl,
    `file:///node_modules/.hostfunc/${packageName.replace(/[^\w@/-]/g, "_")}.d.ts`,
  );
  loadedLibs.add(libKey);
}

function configureMonacoDefaults(monaco: Monaco) {
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    HOSTFUNC_TYPES_DTS,
    "file:///node_modules/@hostfunc/sdk/index.d.ts",
  );
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2022,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    strict: true,
    noImplicitAny: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    isolatedModules: true,
    noUncheckedIndexedAccess: true,
    allowNonTsExtensions: true,
    resolveJsonModule: true,
    noEmit: true,
    lib: ["es2022", "dom"],
  });
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
}

// ---------------------------------------------------------------------------
// Hover panel shared types
// ---------------------------------------------------------------------------

type SymbolDisplayPart = { text: string; kind: string };
type JsDocTag = { name: string; text?: SymbolDisplayPart[] };
type DiagnosticMarker = {
  severity: number;
  message: string;
  source?: string;
  code?: string | number;
};

// Discriminated union — all hover state flows through this type.
type HoverState =
  | { kind: "module"; module: string; x: number; y: number }
  | {
      kind: "symbol";
      signatureParts: SymbolDisplayPart[];
      docs: string;
      tags: JsDocTag[];
      x: number;
      y: number;
    }
  | {
      kind: "diagnostic";
      markers: DiagnosticMarker[];
      x: number;
      y: number;
    };

// ---------------------------------------------------------------------------
// Shared panel utilities
// ---------------------------------------------------------------------------

const PANEL_WIDTH = 520;

function computePanelPosition(cursorX: number, cursorY: number) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const estimatedHeight = 480;
  const left = Math.max(8, Math.min(cursorX + 16, vw - PANEL_WIDTH - 16));
  const belowY = cursorY + 28;
  const top =
    belowY + estimatedHeight > vh
      ? Math.max(8, cursorY - estimatedHeight - 8)
      : belowY;
  return { left, top };
}

function PanelShell({
  x,
  y,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  x: number;
  y: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}) {
  const { left, top } = computePanelPosition(x, y);
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ left, top, width: PANEL_WIDTH }}
      className="fixed z-[9999] max-h-[70vh] overflow-y-auto overflow-x-hidden rounded-xl border border-white/[0.12] bg-[#0d1117] shadow-[0_8px_32px_rgba(0,0,0,0.6)] ring-1 ring-black/20"
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SdkHoverPanel — module import quick-reference
// ---------------------------------------------------------------------------

function SdkHoverPanel({
  doc,
  x,
  y,
  onMouseEnter,
  onMouseLeave,
}: {
  doc: SdkHoverDoc;
  x: number;
  y: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <PanelShell x={x} y={y} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="border-b border-white/[0.08] bg-[#161b22] px-4 py-3">
        <div className="font-mono text-sm font-semibold text-violet-300">{doc.title}</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-slate-400">{doc.summary}</div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Import
          </div>
          <pre className="overflow-x-auto rounded-md border border-white/[0.08] bg-black/50 px-3 py-2 font-mono text-[12px] text-emerald-300">
            {doc.canonicalImport}
          </pre>
        </div>

        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Key exports
          </div>
          <div className="overflow-hidden rounded-md border border-white/[0.08]">
            {doc.api.map((row, i) => (
              <div
                key={row.symbol}
                className={`flex items-baseline gap-3 px-3 py-2 font-mono text-[12px] ${
                  i < doc.api.length - 1 ? "border-b border-white/[0.06]" : ""
                }`}
              >
                <span className="flex-shrink-0 text-amber-300">{row.symbol}</span>
                <span className="truncate text-slate-400">{row.sig}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Example
          </div>
          <pre className="overflow-x-auto rounded-md border border-white/[0.08] bg-black/50 px-3 py-2 font-mono text-[12px] leading-relaxed text-slate-300">
            {doc.example}
          </pre>
        </div>

        {doc.tip && (
          <div className="rounded-md border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Note: </span>
            {doc.tip}
          </div>
        )}
      </div>
    </PanelShell>
  );
}

// ---------------------------------------------------------------------------
// SymbolHoverPanel — TypeScript symbol hover (fn.executeFunction, etc.)
// ---------------------------------------------------------------------------

function partKindToClass(kind: string): string {
  switch (kind) {
    case "keyword":
      return "text-violet-300";
    case "functionName":
    case "methodName":
    case "memberFunctionElement":
      return "text-amber-300";
    case "parameterName":
      return "text-orange-300";
    case "typeName":
    case "interfaceName":
    case "typeParameterName":
    case "aliasName":
      return "text-sky-300";
    case "moduleName":
    case "externalModuleName":
      return "text-emerald-300";
    case "propertyName":
    case "memberVariableElement":
      return "text-blue-300";
    case "stringLiteral":
      return "text-amber-200";
    default:
      return "text-slate-300";
  }
}

function renderTagText(parts: SymbolDisplayPart[] | undefined): string {
  return (parts ?? []).map((p) => p.text).join("");
}

function SymbolHoverPanel({
  signatureParts,
  docs,
  tags,
  x,
  y,
  onMouseEnter,
  onMouseLeave,
}: {
  signatureParts: SymbolDisplayPart[];
  docs: string;
  tags: JsDocTag[];
  x: number;
  y: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const paramTags = tags.filter((t) => t.name === "param");
  const returnsTags = tags.filter((t) => t.name === "returns");
  const throwsTags = tags.filter((t) => t.name === "throws");
  const exampleTags = tags.filter((t) => t.name === "example");
  const otherTags = tags.filter(
    (t) => !["param", "returns", "throws", "example"].includes(t.name),
  );

  return (
    <PanelShell x={x} y={y} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {/* Signature */}
      <div className="border-b border-white/[0.08] bg-[#161b22] px-4 py-3">
        <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed">
          {signatureParts.map((part, i) => (
            <span key={`${i}:${part.kind}`} className={partKindToClass(part.kind)}>
              {part.text}
            </span>
          ))}
        </pre>
      </div>

      <div className="space-y-4 px-4 py-4">
        {/* Documentation prose */}
        {docs && (
          <p className="text-[12px] leading-relaxed text-slate-300">{docs}</p>
        )}

        {/* @param */}
        {paramTags.length > 0 && (
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Parameters
            </div>
            <div className="overflow-hidden rounded-md border border-white/[0.08]">
              {paramTags.map((tag, i) => {
                const parts = tag.text ?? [];
                // First part is usually the param name (kind: "parameterName")
                const namePart = parts.find((p) => p.kind === "parameterName");
                const descParts = namePart
                  ? parts.filter((p) => p !== namePart)
                  : parts;
                const desc = descParts
                  .map((p) => p.text)
                  .join("")
                  .replace(/^\s*[-–]\s*/, "");
                return (
                  <div
                    key={`${i}:${namePart?.text ?? "param"}`}
                    className={`flex items-baseline gap-3 px-3 py-2 font-mono text-[12px] ${
                      i < paramTags.length - 1 ? "border-b border-white/[0.06]" : ""
                    }`}
                  >
                    <span className="flex-shrink-0 text-orange-300">
                      {namePart?.text ?? `param${i}`}
                    </span>
                    {desc && (
                      <span className="font-sans text-slate-400">{desc}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* @returns */}
        {returnsTags.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Returns
            </div>
            {returnsTags.map((tag) => (
              <p key={`returns:${renderTagText(tag.text).slice(0, 40)}`} className="text-[12px] leading-relaxed text-slate-300">
                {renderTagText(tag.text)}
              </p>
            ))}
          </div>
        )}

        {/* @throws */}
        {throwsTags.length > 0 && (
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Throws
            </div>
            <div className="space-y-1">
              {throwsTags.map((tag) => (
                <p key={`throws:${renderTagText(tag.text).slice(0, 40)}`} className="text-[12px] leading-relaxed text-slate-300">
                  {renderTagText(tag.text)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* @example */}
        {exampleTags.length > 0 && (
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Example
            </div>
            {exampleTags.map((tag) => (
              <pre
                key={`example:${renderTagText(tag.text).slice(0, 40)}`}
                className="overflow-x-auto rounded-md border border-white/[0.08] bg-black/50 px-3 py-2 font-mono text-[12px] leading-relaxed text-slate-300"
              >
                {renderTagText(tag.text).replace(/^\n/, "")}
              </pre>
            ))}
          </div>
        )}

        {/* Other tags */}
        {otherTags.map((tag, i) => (
          <div key={`${i}:${tag.name}`}>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {tag.name}
            </div>
            <p className="text-[12px] leading-relaxed text-slate-300">
              {renderTagText(tag.text)}
            </p>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

// ---------------------------------------------------------------------------
// DiagnosticPanel — TypeScript/lint error and warning messages
// ---------------------------------------------------------------------------

function severityLabel(sev: number): string {
  if (sev >= 8) return "Error";
  if (sev >= 4) return "Warning";
  if (sev >= 2) return "Info";
  return "Hint";
}

function severityClasses(sev: number) {
  if (sev >= 8) return { label: "text-red-400", msg: "text-red-300", dot: "bg-red-400" };
  if (sev >= 4) return { label: "text-amber-400", msg: "text-amber-200", dot: "bg-amber-400" };
  if (sev >= 2) return { label: "text-sky-400", msg: "text-sky-300", dot: "bg-sky-400" };
  return { label: "text-slate-400", msg: "text-slate-300", dot: "bg-slate-500" };
}

function DiagnosticPanel({
  markers,
  x,
  y,
  onMouseEnter,
  onMouseLeave,
}: {
  markers: DiagnosticMarker[];
  x: number;
  y: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <PanelShell x={x} y={y} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="divide-y divide-white/[0.06]">
        {markers.map((mk) => {
          const cls = severityClasses(mk.severity);
          const badge = [mk.source, mk.code !== undefined ? `(${mk.code})` : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <div key={`${mk.severity}:${mk.message.slice(0, 60)}`} className="px-4 py-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cls.dot}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${cls.label}`}>
                  {severityLabel(mk.severity)}
                </span>
                {badge && (
                  <span className="ml-auto font-mono text-[10px] text-slate-500">{badge}</span>
                )}
              </div>
              <p className={`text-[12px] leading-relaxed ${cls.msg}`}>{mk.message}</p>
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
}

// ---------------------------------------------------------------------------
// MonacoEditor
// ---------------------------------------------------------------------------

export function MonacoEditor({ value, packageNames, onChange, onSave, readOnly = false }: Props) {
  const monacoRef = useRef<Monaco | null>(null);
  const loadedLibsRef = useRef<Set<string>>(new Set());
  const [hover, setHover] = useState<HoverState | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symbolTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setHover(null), 220);
  }, []);

  const cancelDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  // Clean up lingering timers on unmount.
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (symbolTimerRef.current) clearTimeout(symbolTimerRef.current);
    };
  }, []);

  const handleMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;
    configureMonacoDefaults(monaco);

    const formatAndSave = async () => {
      await editor.getAction("editor.action.formatDocument")?.run();
      onSave?.();
    };

    if (!readOnly) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        void formatAndSave();
      });
    }

    const importRe = /from\s+["'](@hostfunc\/[^"']+)["']/g;

    editor.onMouseMove((e) => {
      // Cancel any pending symbol lookup when the mouse moves.
      if (symbolTimerRef.current) clearTimeout(symbolTimerRef.current);

      if (!e.target.position) {
        scheduleDismiss();
        return;
      }
      const model = editor.getModel();
      if (!model) {
        scheduleDismiss();
        return;
      }
      const pos = e.target.position;
      const line = model.getLineContent(pos.lineNumber);
      const col = pos.column - 1; // 0-indexed

      // Fast path: @hostfunc/... module specifier in an import string.
      importRe.lastIndex = 0;
      for (const m of line.matchAll(importRe)) {
        const spec = m[1] ?? "";
        const specStart = line.indexOf(spec, m.index ?? 0);
        const specEnd = specStart + spec.length;
        if (col >= specStart && col <= specEnd && HOSTFUNC_HOVER_DOCS[spec]) {
          cancelDismiss();
          setHover({ kind: "module", module: spec, x: e.event.posx, y: e.event.posy });
          return;
        }
      }

      // Fast path: TypeScript/lint diagnostics at this position (synchronous).
      type IMarker = Monaco["editor"]["IMarker"];
      const allMarkers: IMarker[] = monaco.editor.getModelMarkers({ resource: model.uri });
      const markersHere = allMarkers.filter(
        (mk: IMarker) =>
          pos.lineNumber >= mk.startLineNumber &&
          pos.lineNumber <= mk.endLineNumber &&
          (pos.lineNumber !== mk.startLineNumber || pos.column >= mk.startColumn) &&
          (pos.lineNumber !== mk.endLineNumber || pos.column <= mk.endColumn),
      );
      if (markersHere.length > 0) {
        cancelDismiss();
        setHover({
          kind: "diagnostic",
          markers: markersHere.map((mk: IMarker) => ({
            severity: mk.severity,
            message: mk.message,
            source: mk.source,
            code: typeof mk.code === "object" ? mk.code.value : mk.code,
          })),
          x: e.event.posx,
          y: e.event.posy,
        });
        return;
      }

      // Slow path: any TypeScript symbol — debounced to avoid flooding the worker.
      const word = model.getWordAtPosition(pos);
      if (word) {
        const capturedX = e.event.posx;
        const capturedY = e.event.posy;
        symbolTimerRef.current = setTimeout(() => {
          void (async () => {
            try {
              const getWorker = await monaco.languages.typescript.getTypeScriptWorker();
              const client = await getWorker(model.uri);
              const offset = model.getOffsetAt(pos);
              const info = await client.getQuickInfoAtPosition(model.uri.toString(), offset);
              if ((info?.displayParts?.length ?? 0) > 0 || (info?.documentation?.length ?? 0) > 0) {
                cancelDismiss();
                setHover({
                  kind: "symbol",
                  signatureParts: (info?.displayParts ?? []) as SymbolDisplayPart[],
                  docs: (info?.documentation ?? []).map((p: SymbolDisplayPart) => p.text).join(""),
                  tags: (info?.tags ?? []) as JsDocTag[],
                  x: capturedX,
                  y: capturedY,
                });
              }
            } catch {
              // Worker errors are non-fatal — just show nothing.
            }
          })();
        }, 350);
      }

      scheduleDismiss();
    });

    editor.onMouseLeave(() => {
      if (symbolTimerRef.current) clearTimeout(symbolTimerRef.current);
      scheduleDismiss();
    });
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    const candidates = [...new Set(packageNames)].filter((name) => name && !INTERNAL_MODULES.has(name));
    if (candidates.length === 0) return;

    void (async () => {
      for (const packageName of candidates) {
        const loaded = await addTypePackageLibs(monaco, packageName, loadedLibsRef.current);
        if (!loaded) {
          addFallbackModuleDeclaration(monaco, packageName, loadedLibsRef.current);
        }
      }
    })();
  }, [packageNames]);

  return (
    <>
      <Editor
        height="100%"
        defaultLanguage="typescript"
        defaultPath="file:///main.ts"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        options={{
          fontSize: 14,
          fontFamily: "ui-monospace, JetBrains Mono, monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          renderLineHighlight: "all",
          formatOnPaste: true,
          formatOnType: true,
          autoIndent: "full",
          wordWrap: "on",
          wrappingIndent: "same",
          bracketPairColorization: { enabled: true },
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            comments: true,
            other: true,
            strings: true,
          },
          tabSize: 2,
          automaticLayout: true,
          readOnly,
          // Disable Monaco's built-in hover widget — our portal handles all hovers.
          hover: { enabled: false },
        }}
      />
      {hover !== null &&
        typeof document !== "undefined" &&
        createPortal(
          (() => {
            if (hover.kind === "diagnostic") {
              return (
                <DiagnosticPanel
                  markers={hover.markers}
                  x={hover.x}
                  y={hover.y}
                  onMouseEnter={cancelDismiss}
                  onMouseLeave={() => setHover(null)}
                />
              );
            }
            if (hover.kind === "module") {
              const doc = HOSTFUNC_HOVER_DOCS[hover.module];
              if (!doc) return null;
              return (
                <SdkHoverPanel
                  doc={doc}
                  x={hover.x}
                  y={hover.y}
                  onMouseEnter={cancelDismiss}
                  onMouseLeave={() => setHover(null)}
                />
              );
            }
            return (
              <SymbolHoverPanel
                signatureParts={hover.signatureParts}
                docs={hover.docs}
                tags={hover.tags}
                x={hover.x}
                y={hover.y}
                onMouseEnter={cancelDismiss}
                onMouseLeave={() => setHover(null)}
              />
            );
          })(),
          document.body,
        )}
    </>
  );
}

interface DiffProps {
  originalValue: string;
  modifiedValue: string;
  packageNames: string[];
}

export function MonacoDiffEditor({ originalValue, modifiedValue, packageNames }: DiffProps) {
  const monacoRef = useRef<Monaco | null>(null);
  const loadedLibsRef = useRef<Set<string>>(new Set());

  const handleMount: DiffOnMount = (_editor, monaco) => {
    monacoRef.current = monaco;
    configureMonacoDefaults(monaco);
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    const candidates = [...new Set(packageNames)].filter((name) => name && !INTERNAL_MODULES.has(name));
    if (candidates.length === 0) return;
    void (async () => {
      for (const packageName of candidates) {
        const loaded = await addTypePackageLibs(monaco, packageName, loadedLibsRef.current);
        if (!loaded) addFallbackModuleDeclaration(monaco, packageName, loadedLibsRef.current);
      }
    })();
  }, [packageNames]);

  return (
    <DiffEditor
      height="100%"
      original={originalValue}
      modified={modifiedValue}
      language="typescript"
      theme="vs-dark"
      onMount={handleMount}
      options={{
        readOnly: true,
        renderSideBySide: true,
        ignoreTrimWhitespace: false,
        minimap: { enabled: false },
        fontSize: 14,
        automaticLayout: true,
      }}
    />
  );
}

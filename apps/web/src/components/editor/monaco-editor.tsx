"use client";

import type { DiffOnMount, OnMount } from "@monaco-editor/react";
import { DiffEditor, Editor } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import { HOSTFUNC_TYPES_DTS } from "./hostfunc-types";

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

export function MonacoEditor({ value, packageNames, onChange, onSave, readOnly = false }: Props) {
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const loadedLibsRef = useRef<Set<string>>(new Set());

  const handleMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;
    configureMonacoDefaults(monaco);

    const formatAndSave = async () => {
      await editor.getAction("editor.action.formatDocument")?.run();
      onSave?.();
    };

    // Cmd/Ctrl + S to save
    if (!readOnly) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        void formatAndSave();
      });
    }
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
      }}
    />
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

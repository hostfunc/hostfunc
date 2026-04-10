"use client";

import type { OnMount } from "@monaco-editor/react";
import { Editor } from "@monaco-editor/react";
import { useRef } from "react";
import { HOSTFUNC_TYPES_DTS } from "./hostfunc-types";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

export function MonacoEditor({ value, onChange, onSave }: Props) {
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;

    // Inject @hostfunc/fn types into Monaco's virtual filesystem
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      HOSTFUNC_TYPES_DTS,
      "file:///node_modules/@hostfunc/fn/index.d.ts",
    );

    // Match our project's strict TS config
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
      lib: ["es2022", "dom"],
    });

    // Cmd/Ctrl + S to save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });
  };

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
        tabSize: 2,
        automaticLayout: true,
      }}
    />
  );
}
"use client";

import { AlertCircle, Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./button";

interface MoleculeViewerProps {
  smiles: string;
  width?: number;
  height?: number;
  className?: string;
}

export function MoleculeViewer({
  smiles,
  width = 400,
  height = 300,
  className = "",
}: MoleculeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [SmilesDrawer, setSmilesDrawer] = useState<unknown>(null);

  useEffect(() => {
    isMountedRef.current = true;

    // Load smiles-drawer from CDN
    const loadSmilesDrawer = async () => {
      try {
        // Check if already loaded
        if ((window as { SmilesDrawer?: unknown }).SmilesDrawer) {
          if (isMountedRef.current) {
            setSmilesDrawer((window as { SmilesDrawer?: unknown }).SmilesDrawer);
          }
          return;
        }

        // Load the library
        const script = document.createElement("script");
        script.src =
          "https://unpkg.com/smiles-drawer@2.0.1/dist/smiles-drawer.min.js";
        script.async = true;
        script.onload = () => {
          if (isMountedRef.current) {
            setSmilesDrawer((window as { SmilesDrawer?: unknown }).SmilesDrawer);
          }
        };
        script.onerror = () => {
          if (isMountedRef.current) {
            setError(true);
            setLoading(false);
          }
        };
        document.head.appendChild(script);
        scriptRef.current = script;
      } catch (err) {
        console.error("Failed to load smiles-drawer:", err);
        if (isMountedRef.current) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadSmilesDrawer();

    // Cleanup: remove script tag on unmount
    return () => {
      isMountedRef.current = false;
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!SmilesDrawer || !canvasRef.current || !smiles) return;

    try {
      // Create a new SmilesDrawer instance
      const drawer = new (SmilesDrawer as { Drawer: new (config: unknown) => { draw: (tree: unknown, canvas: HTMLCanvasElement | null, theme: string, replaceMode: boolean) => void } }).Drawer({
        width,
        height,
        bondThickness: 1.5,
        fontSizeLarge: 14,
        fontSizeSmall: 10,
        padding: 20,
      });

      // Parse and draw the SMILES string
      (SmilesDrawer as { parse: (smiles: string, success: (tree: unknown) => void, error: (err: unknown) => void) => void }).parse(
        smiles,
        (tree: unknown) => {
          if (!tree || (tree as { error?: unknown }).error) {
            console.error(
              "Failed to parse SMILES:",
              (tree as { error?: unknown })?.error,
            );
            setError(true);
            setLoading(false);
            return;
          }

          drawer.draw(tree, canvasRef.current, "light", false);
          setLoading(false);
        },
        (err: unknown) => {
          console.error("Failed to parse SMILES:", err);
          setError(true);
          setLoading(false);
        },
      );
    } catch (err) {
      console.error("Failed to draw molecule:", err);
      setError(true);
      setLoading(false);
    }
  }, [SmilesDrawer, smiles, width, height]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(smiles);
      setCopied(true);

      // Clear any existing timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      // Reset copied state after 2 seconds
      copyTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setCopied(false);
        }
        copyTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [smiles]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative group ${className}`}>
      {loading && !error && (
        <div
          className="flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200"
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          <div className="text-sm text-slate-500">Loading structure...</div>
        </div>
      )}

      {error && (
        <div
          className="flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-200 gap-2"
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          <AlertCircle className="w-8 h-8 text-slate-400" />
          <div className="text-sm text-slate-500 text-center px-4">
            Unable to render structure
          </div>
          <div className="text-xs text-slate-400 font-mono max-w-[300px] break-all px-4">
            {smiles}
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`rounded-lg border border-slate-200 bg-white ${error || loading ? "hidden" : ""}`}
        style={{ width: `${width}px`, height: `${height}px` }}
      />

      {/* Copy SMILES Button - shows on hover */}
      {!loading && !error && (
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="absolute top-2 right-2 gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-600">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy SMILES
            </>
          )}
        </Button>
      )}
    </div>
  );
}

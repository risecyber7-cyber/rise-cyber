import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalProps {
  onCommand: (command: string) => void;
  output: string;
  prompt: string;
  isProcessing: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ onCommand, output, prompt, isProcessing }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentLineRef = useRef('');

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#000500',
        foreground: '#00FF41',
        cursor: '#00FF41',
        selectionBackground: 'rgba(0, 255, 65, 0.3)',
        black: '#000000',
        red: '#FF0000',
        green: '#00FF41',
        yellow: '#FFFF00',
        blue: '#0087FF',
        magenta: '#FF00FF',
        cyan: '#00FFFF',
        white: '#FFFFFF',
        brightBlack: '#808080',
        brightRed: '#FF0000',
        brightGreen: '#00FF41',
        brightYellow: '#FFFF00',
        brightBlue: '#0087FF',
        brightMagenta: '#FF00FF',
        brightCyan: '#00FFFF',
        brightWhite: '#FFFFFF',
      },
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 14,
      lineHeight: 1.2,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    
    let isDisposed = false;

    const safeFit = () => {
      if (isDisposed || !terminalRef.current || !xtermRef.current) return;
      
      // Ensure the terminal is attached to the DOM and has dimensions
      const rect = terminalRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        try {
          // fitAddon internally checks for this._terminal.dimensions
          // We ensure fitAddon is still valid and term is open
          if (fitAddonRef.current && (xtermRef.current as any)._core?.viewport) {
            fitAddonRef.current.fit();
          }
        } catch (e) {
          // Ignore fit errors during rapid layout changes
        }
      }
    };

    // Use a small delay to ensure the terminal is fully rendered before fitting
    const timer = setTimeout(safeFit, 100);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[1;32m[ ACCESS GRANTED ]\x1b[0m');
    term.writeln('\x1b[1;32mWelcome to CyberLab Ubuntu Simulation v1.0\x1b[0m');
    term.writeln('\x1b[1;32mType "help" for a list of available tools.\x1b[0m');
    term.write(`\r\n${prompt}`);

    term.onData((data) => {
      if (isProcessing || isDisposed) return;

      const code = data.charCodeAt(0);
      if (code === 13) { // Enter
        const cmd = currentLineRef.current.trim();
        term.write('\r\n');
        if (cmd) {
          onCommand(cmd);
        } else {
          term.write(prompt);
        }
        currentLineRef.current = '';
      } else if (code === 127) { // Backspace
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (code < 32) {
        // Ignore other control characters
      } else {
        currentLineRef.current += data;
        term.write(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      safeFit();
    });
    
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      isDisposed = true;
      clearTimeout(timer);
      resizeObserver.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (xtermRef.current && output) {
      if (output === '\x1b[2J\x1b[H') {
        xtermRef.current.write('\x1b[2J\x1b[H');
        xtermRef.current.write(prompt);
        return;
      }

      // Convert markdown-ish output to terminal-friendly output
      const lines = output.split('\n');
      lines.forEach((line, index) => {
        // Simple markdown to ANSI conversion
        let formattedLine = line
          .replace(/\*\*(.*?)\*\*/g, '\x1b[1;32m$1\x1b[0m') // Bold (vibrant green)
          .replace(/### (.*)/g, '\x1b[1;36m$1\x1b[0m') // Heading (cyan)
          .replace(/- \*\*(.*?)\*\*/g, '  \x1b[1;32m• $1\x1b[0m'); // List items
        
        if (index === lines.length - 1 && !line) return; // Skip last empty line
        xtermRef.current?.writeln(formattedLine);
      });
      xtermRef.current.write(`\r\n${prompt}`);
    }
  }, [output, prompt]);

  return (
    <div className="flex-1 overflow-hidden bg-[#000500] p-2">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
  );
};

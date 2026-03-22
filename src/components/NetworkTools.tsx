import React, { useState, useEffect } from 'react';
import { Search, Globe, Shield, Activity, Terminal, Play, X, ChevronRight, Cpu, Database, Layout, Folder, Settings, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Host {
  ip: string;
  hostname: string;
  status: 'up' | 'down';
  ports: { port: number; service: string; status: 'open' | 'closed' }[];
}

export const NetworkTools: React.FC = () => {
  const [target, setTarget] = useState('192.168.1.0/24');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<Host[]>([]);
  const [scanLog, setScanLog] = useState<string[]>([]);

  const simulateScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanResults([]);
    setScanLog([`Starting Nmap 7.92 at ${new Date().toLocaleString()}`, `Scanning ${target}...`]);

    const mockHosts: Host[] = [
      {
        ip: '192.168.1.1',
        hostname: 'gateway.lab',
        status: 'up',
        ports: [
          { port: 80, service: 'http', status: 'open' },
          { port: 443, service: 'https', status: 'open' },
          { port: 53, service: 'domain', status: 'open' },
        ],
      },
      {
        ip: '192.168.1.100',
        hostname: 'target-server.lab',
        status: 'up',
        ports: [
          { port: 22, service: 'ssh', status: 'open' },
          { port: 80, service: 'http', status: 'open' },
          { port: 3306, service: 'mysql', status: 'open' },
        ],
      },
      {
        ip: '192.168.1.105',
        hostname: 'workstation-01.lab',
        status: 'up',
        ports: [
          { port: 135, service: 'msrpc', status: 'open' },
          { port: 445, service: 'microsoft-ds', status: 'open' },
        ],
      },
    ];

    for (let i = 0; i <= 100; i += 5) {
      setScanProgress(i);
      if (i === 20) setScanLog(prev => [...prev, 'Host discovery initiated...']);
      if (i === 40) setScanLog(prev => [...prev, 'Found 3 active hosts.']);
      if (i === 60) setScanLog(prev => [...prev, 'Scanning ports on 192.168.1.1...']);
      if (i === 80) setScanLog(prev => [...prev, 'Scanning ports on 192.168.1.100...']);
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    setScanResults(mockHosts);
    setScanLog(prev => [...prev, 'Scan completed successfully.', `Nmap done: 256 IP addresses (3 hosts up) scanned in ${Math.random().toFixed(2)} seconds`]);
    setIsScanning(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-[#00FF41] font-mono p-4 overflow-hidden">
      <div className="flex items-center gap-4 mb-6 border-b border-[#00FF41]/20 pb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00FF41]/40" />
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Enter target IP or range (e.g., 192.168.1.0/24)"
            className="w-full bg-[#00FF41]/5 border border-[#00FF41]/20 rounded py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#00FF41]/50 transition-all"
          />
        </div>
        <button
          onClick={simulateScan}
          disabled={isScanning}
          className="px-6 py-2 bg-[#00FF41] text-black font-bold rounded hover:bg-[#00FF41]/80 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {isScanning ? 'SCANNING...' : 'START SCAN'}
        </button>
      </div>

      {isScanning && (
        <div className="mb-6">
          <div className="flex justify-between text-[10px] mb-1 uppercase tracking-widest">
            <span>Scan Progress</span>
            <span>{scanProgress}%</span>
          </div>
          <div className="h-1 bg-[#00FF41]/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#00FF41]"
              initial={{ width: 0 }}
              animate={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
        {/* Scan Log */}
        <div className="flex flex-col border border-[#00FF41]/20 rounded bg-black/40 overflow-hidden">
          <div className="px-4 py-2 border-b border-[#00FF41]/20 bg-[#00FF41]/5 flex items-center gap-2">
            <Terminal className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Console Output</span>
          </div>
          <div className="flex-1 p-4 text-xs overflow-y-auto custom-scrollbar space-y-1">
            {scanLog.map((line, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[#00FF41]/40">[{i}]</span>
                <span>{line}</span>
              </div>
            ))}
            {isScanning && <div className="w-2 h-4 bg-[#00FF41] animate-pulse inline-block ml-2" />}
          </div>
        </div>

        {/* Scan Results */}
        <div className="flex flex-col border border-[#00FF41]/20 rounded bg-black/40 overflow-hidden">
          <div className="px-4 py-2 border-b border-[#00FF41]/20 bg-[#00FF41]/5 flex items-center gap-2">
            <Database className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Discovered Hosts</span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
            {scanResults.length === 0 && !isScanning && (
              <div className="h-full flex flex-col items-center justify-center text-[#00FF41]/20">
                <Globe className="w-12 h-12 mb-2 opacity-10" />
                <p className="text-xs">No scan results available. Initiate a scan to discover hosts.</p>
              </div>
            )}
            {scanResults.map((host, i) => (
              <motion.div
                key={host.ip}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-3 bg-[#00FF41]/5 border border-[#00FF41]/10 rounded hover:border-[#00FF41]/30 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
                    <span className="font-bold text-sm">{host.ip}</span>
                    <span className="text-[10px] text-[#00FF41]/60">({host.hostname})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-[#00FF41]/10 rounded uppercase tracking-tighter">Status: {host.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {host.ports.map((port) => (
                    <div key={port.port} className="p-2 bg-black/40 rounded border border-[#00FF41]/5 text-[10px]">
                      <div className="font-bold">{port.port}/{port.service}</div>
                      <div className="text-[#00FF41]/60 uppercase">{port.status}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

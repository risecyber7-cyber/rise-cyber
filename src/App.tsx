/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  OperationType,
  handleFirestoreError
} from './firebase';
import { 
  Terminal as TerminalIcon, 
  Shield, 
  Lock, 
  User, 
  LogOut, 
  History, 
  Play, 
  X,
  ChevronRight,
  Cpu,
  Globe,
  Database,
  Search,
  Layout,
  Folder,
  Settings,
  Activity,
  Maximize2,
  Terminal as TerminalIcon2,
  Cloud,
  RefreshCw,
  Upload,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import { Terminal as XTermTerminal } from './components/Terminal';
import { Window, TaskbarIcon } from './components/OSComponents';
import { NetworkTools } from './components/NetworkTools';
import { CloudSync } from './components/CloudSync';
import { Kernel, type KernelResponse, type SystemIntent, type FileSystem } from './services/kernel';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: any;
  lastLogin: any;
}

interface CommandLog {
  id: string;
  command: string;
  description: string;
  output: string;
  timestamp: any;
}

interface Session {
  id: string;
  userId: string;
  startTime: any;
  status: 'active' | 'completed';
}

const COMMANDS: Record<string, { description: string; output: string | ((args: string[], fs: any, currentDir: string) => string) }> = {
  'help': {
    description: 'List all available commands',
    output: `
### Ubuntu Lab Commands:
- **ls [dir]**: List directory contents
- **cd <dir>**: Change directory
- **pwd**: Print working directory
- **cat <file>**: Read file content
- **mkdir <dir>**: Create a new directory
- **touch <file>**: Create a new empty file
- **rm <path>**: Remove a file or directory
- **mv <src> <dest>**: Move/rename a file or directory
- **uname -a**: Display system information
- **whoami**: Display current user
- **ifconfig**: Display network configuration
- **ping <host>**: Send ICMP ECHO_REQUEST to network hosts
- **apt update/install**: Package manager simulation
- **git clone <url>**: Clone a repository
- **python <file>**: Run Python script
- **node <file>**: Run Node.js script
- **sudo <cmd>**: Execute a command as superuser
- **nmap <target>**: Network exploration tool
- **desktop <id>**: Switch virtual desktop
- **upload <file> [provider]**: Upload file to cloud
- **download <file> [provider]**: Download file from cloud
- **sync**: Sync all files across devices
- **sqlmap <url>**: SQL injection tool
- **clear**: Clear terminal
- **exit**: End session
`
  },
  'uname': {
    description: 'Display system information',
    output: (args) => {
      if (args.includes('-a')) {
        return 'Linux ubuntu 5.15.0-101-generic #111-Ubuntu SMP Tue Feb 11 19:09:21 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux';
      }
      return 'Linux';
    }
  },
  'ifconfig': {
    description: 'Display network configuration',
    output: `
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 172.17.0.2  netmask 255.255.0.0  broadcast 172.17.255.255
        ether 02:42:ac:11:00:02  txqueuelen 0  (Ethernet)
        RX packets 12  bytes 936 (936.0 B)
        TX packets 0  bytes 0 (0.0 B)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        loopback  txqueuelen 1000  (Local Loopback)
`
  },
  'ping': {
    description: 'Send ICMP ECHO_REQUEST to network hosts',
    output: (args) => {
      if (!args[0]) return 'ping: usage error: Destination address required';
      const host = args[0];
      return `
PING ${host} (142.250.190.78) 56(84) bytes of data.
64 bytes from ${host} (142.250.190.78): icmp_seq=1 ttl=117 time=14.2 ms
64 bytes from ${host} (142.250.190.78): icmp_seq=2 ttl=117 time=13.8 ms
64 bytes from ${host} (142.250.190.78): icmp_seq=3 ttl=117 time=14.5 ms
^C
--- ${host} ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
rtt min/avg/max/mdev = 13.842/14.185/14.512/0.278 ms
`;
    }
  },
  'apt': {
    description: 'Simulate package manager',
    output: (args) => {
      if (args[0] === 'update') {
        return `
Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease
Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]
Get:3 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
All packages are up to date.
`;
      }
      if (args[0] === 'install') {
        const pkg = args[1] || 'package';
        return `
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
The following NEW packages will be installed:
  ${pkg}
0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.
Need to get 1,240 kB of archives.
After this operation, 4,512 kB of additional disk space will be used.
Get:1 http://archive.ubuntu.com/ubuntu jammy/main amd64 ${pkg} [1,240 kB]
Fetched 1,240 kB in 0s (4,512 kB/s)
Selecting previously unselected package ${pkg}.
(Reading database ... 124512 files and directories currently installed.)
Preparing to unpack .../${pkg}_1.0.0_amd64.deb ...
Unpacking ${pkg} (1.0.0) ...
Setting up ${pkg} (1.0.0) ...
`;
      }
      return 'Usage: apt update | install <package>';
    }
  },
  'git': {
    description: 'Distributed version control system',
    output: (args) => {
      if (args[0] === 'clone') {
        const repo = args[1] || 'https://github.com/example/repo.git';
        const name = repo.split('/').pop()?.replace('.git', '') || 'repo';
        return `
Cloning into '${name}'...
remote: Enumerating objects: 142, done.
remote: Counting objects: 100% (142/142), done.
remote: Compressing objects: 100% (88/88), done.
remote: Total 142 (delta 54), reused 130 (delta 42), pack-reused 0
Receiving objects: 100% (142/142), 24.52 KiB | 1.23 MiB/s, done.
Resolving deltas: 100% (54/54), done.
`;
      }
      return 'git: usage error: git clone <url>';
    }
  },
  'python': {
    description: 'Python interpreter',
    output: (args) => {
      if (!args[0]) return 'Python 3.10.12 (main, Nov 20 2023, 15:14:05) [GCC 11.4.0] on linux\nType "help", "copyright", "credits" or "license" for more information.\n>>> ';
      return `Executing ${args[0]}...\n[PYTHON_OUTPUT] Simulation complete.`;
    }
  },
  'node': {
    description: 'Node.js runtime',
    output: (args) => {
      if (!args[0]) return 'Welcome to Node.js v18.19.0.\nType ".help" for more information.\n> ';
      return `Executing ${args[0]}...\n[NODE_OUTPUT] Simulation complete.`;
    }
  },
  'sudo': {
    description: 'Execute a command as superuser',
    output: (args) => {
      if (!args[0]) return 'usage: sudo -h | -K | -k | -V\nusage: sudo -v [-AknS] [-g group] [-h host] [-p prompt] [-u user]\nusage: sudo -l [-AknS] [-g group] [-h host] [-p prompt] [-U user] [-u user] [command]\nusage: sudo [-AbEHknPS] [-r role] [-t type] [-C num] [-g group] [-h host] [-p prompt] [-T timeout] [-u user] [command] [args]';
      return `[sudo] password for risecyber: \nExecuting ${args.join(' ')} as root...`;
    }
  },
  'nmap': {
    description: 'Simulate port scanning',
    output: `
Starting Nmap 7.92 ( https://nmap.org ) at 2026-03-22 05:40 UTC
Nmap scan report for target.lab (192.168.1.100)
Host is up (0.00045s latency).
Not shown: 997 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
443/tcp  open  https

Nmap done: 1 IP address (1 host up) scanned in 0.12 seconds
`
  },
  'desktop': {
    description: 'Switch virtual desktop',
    output: (args) => `Usage: desktop <default|dev|hacking_lab>`
  },
  'upload': {
    description: 'Upload file to cloud storage',
    output: (args) => `Usage: upload <file> [web_os_cloud|gdrive|dropbox]`
  },
  'download': {
    description: 'Download file from cloud storage',
    output: (args) => `Usage: download <file> [web_os_cloud|gdrive|dropbox]`
  },
  'sync': {
    description: 'Sync files across devices',
    output: `Syncing all files across devices...`
  },
  'sqlmap': {
    description: 'Simulate SQL injection testing',
    output: `
[05:40:52] [INFO] testing connection to the target URL
[05:40:52] [INFO] checking if the target is protected by some kind of WAF/IPS
[05:40:53] [INFO] testing if the target URL is stable
[05:40:53] [INFO] target URL is stable
[05:40:53] [INFO] testing if HTTP parameter 'id' is dynamic
[05:40:53] [INFO] HTTP parameter 'id' is dynamic
[05:40:54] [INFO] heuristic (basic) test shows that HTTP parameter 'id' might be injectable (possible DBMS: 'MySQL')
`
  },
  'metasploit': {
    description: 'Simulate launching the framework',
    output: `
      .:okOOOkdl:..          ...:okOOOkdl:.
    ..xOOOOOOOOOOOOOO000000000OOOOOOOOOOOOOOx..
    .0OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO0.
   .OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO.
   :OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO:
   lOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOl
   lOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOl
   :OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO:
   .OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO.
    .0OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO0.
    ..xOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOx..
      .:okOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOkdl:.
          ..:lxk000000000000000xkxl:..

       =[ metasploit v6.1.34-dev                          ]
+ -- --=[ 2198 exploits - 1161 auxiliary - 396 post       ]
+ -- --=[ 596 payloads - 45 encoders - 11 nops            ]
+ -- --=[ 9 evasion                                       ]

msf6 > 
`
  }
};

const INITIAL_FS = {
  '/': { type: 'dir', children: ['home', 'root', 'etc', 'var', 'tmp', 'bin'] },
  '/home': { type: 'dir', children: ['risecyber'] },
  '/home/risecyber': { type: 'dir', children: ['lab_notes.txt', 'tools'] },
  '/home/risecyber/lab_notes.txt': { type: 'file', content: '# Lab Notes\nTarget: 192.168.1.100\nStatus: Scanning ports...' },
  '/home/risecyber/tools': { type: 'dir', children: ['scanner.py'] },
  '/home/risecyber/tools/scanner.py': { type: 'file', content: 'import socket\nprint("Scanning...")' },
  '/root': { type: 'dir', children: [] },
  '/etc': { type: 'dir', children: ['passwd', 'hostname'] },
  '/etc/passwd': { type: 'file', content: 'root:x:0:0:root:/root:/bin/bash\nrisecyber:x:1000:1000:risecyber:/home/risecyber:/bin/bash' },
  '/etc/hostname': { type: 'file', content: 'ubuntu-lab' },
  '/var': { type: 'dir', children: ['log'] },
  '/var/log': { type: 'dir', children: ['syslog'] },
  '/var/log/syslog': { type: 'file', content: 'Mar 22 06:05:04 ubuntu-lab kernel: [0.000000] Linux version 5.15.0-101-generic' },
  '/tmp': { type: 'dir', children: [] }
};

type DesktopId = 'default' | 'dev' | 'hacking_lab';

interface DesktopState {
  id: DesktopId;
  name: string;
  icon: React.ReactNode;
}

const DESKTOPS: DesktopState[] = [
  { id: 'default', name: 'Default', icon: <Layout className="w-3 h-3" /> },
  { id: 'dev', name: 'Development', icon: <Cpu className="w-3 h-3" /> },
  { id: 'hacking_lab', name: 'Hacking Lab', icon: <Shield className="w-3 h-3" /> },
];

interface WindowState {
  id: string;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  desktopId: DesktopId;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [logs, setLogs] = useState<CommandLog[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Desktop-specific states
  const [currentDesktopId, setCurrentDesktopId] = useState<DesktopId>('default');
  const [desktopStates, setDesktopStates] = useState<Record<DesktopId, { currentDir: string; lastOutput: string }>>({
    default: { currentDir: '/home/risecyber', lastOutput: '' },
    dev: { currentDir: '/home/risecyber', lastOutput: '' },
    hacking_lab: { currentDir: '/home/risecyber', lastOutput: '' },
  });

  const [fs, setFs] = useState<FileSystem>(INITIAL_FS);
  const [kernel] = useState(() => new Kernel(INITIAL_FS as FileSystem));
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(50);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const currentDir = desktopStates[currentDesktopId].currentDir;
  const lastOutput = desktopStates[currentDesktopId].lastOutput;

  const setCurrentDir = (dir: string) => {
    setDesktopStates(prev => ({
      ...prev,
      [currentDesktopId]: { ...prev[currentDesktopId], currentDir: dir }
    }));
  };

  const setLastOutput = (output: string) => {
    setDesktopStates(prev => ({
      ...prev,
      [currentDesktopId]: { ...prev[currentDesktopId], lastOutput: output }
    }));
  };

  const openWindow = (id: string, title: string, icon: React.ReactNode) => {
    setWindows(prev => {
      const existing = prev.find(w => w.id === id && w.desktopId === currentDesktopId);
      if (existing) {
        return prev.map(w => ({
          ...w,
          isOpen: w.id === id && w.desktopId === currentDesktopId ? true : w.isOpen,
          isMinimized: w.id === id && w.desktopId === currentDesktopId ? false : w.isMinimized,
          isFocused: w.id === id && w.desktopId === currentDesktopId,
          zIndex: w.id === id && w.desktopId === currentDesktopId ? maxZIndex + 1 : w.zIndex
        }));
      }
      return [...prev, { 
        id, 
        title, 
        icon, 
        isOpen: true, 
        isFocused: true, 
        isMinimized: false, 
        isMaximized: false,
        zIndex: maxZIndex + 1,
        desktopId: currentDesktopId
      }];
    });
    setMaxZIndex(prev => prev + 1);
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isOpen: false, isFocused: false } : w));
  };

  const minimizeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true, isFocused: false } : w));
  };

  const toggleMaximizeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  };

  const focusWindow = (id: string) => {
    setWindows(prev => prev.map(w => ({
      ...w,
      isFocused: w.id === id,
      isMinimized: w.id === id ? false : w.isMinimized,
      zIndex: w.id === id ? maxZIndex + 1 : w.zIndex
    })));
    setMaxZIndex(prev => prev + 1);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Anonymous Hacker',
          photoURL: firebaseUser.photoURL || '',
          createdAt: userSnap.exists() ? userSnap.data().createdAt : serverTimestamp(),
          lastLogin: serverTimestamp(),
        };

        await setDoc(userRef, profile, { merge: true });
        setUser(profile);
        
        // Check for active session
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('userId', '==', firebaseUser.uid),
          where('status', '==', 'active'),
          orderBy('startTime', 'desc')
        );

        onSnapshot(sessionsQuery, (snapshot) => {
          if (!snapshot.empty) {
            const sessionData = snapshot.docs[0].data() as Session;
            setSession(sessionData);
            
            // Listen for logs in this session
            const logsQuery = query(
              collection(db, `sessions/${snapshot.docs[0].id}/logs`),
              orderBy('timestamp', 'asc')
            );
            
            onSnapshot(logsQuery, (logSnapshot) => {
              const logData = logSnapshot.docs.map(d => d.data() as CommandLog);
              setLogs(logData);
            }, (error) => handleFirestoreError(error, OperationType.LIST, `sessions/${snapshot.docs[0].id}/logs`));
          } else {
            setSession(null);
            setLogs([]);
          }
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'sessions'));
      } else {
        setUser(null);
        setSession(null);
        setLogs([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        setError(error.message);
      }
      console.error('Login failed', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (session) {
        await setDoc(doc(db, 'sessions', session.id), { 
          status: 'completed', 
          endTime: serverTimestamp() 
        }, { merge: true });
      }
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const startSession = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const sessionRef = collection(db, 'sessions');
      const newDocRef = doc(sessionRef);
      const newSession = {
        id: newDocRef.id,
        userId: user.uid,
        startTime: serverTimestamp(),
        status: 'active'
      };
      await setDoc(newDocRef, newSession);
      openWindow('terminal', 'Terminal', <TerminalIcon2 className="w-4 h-4" />);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeCommand = async (fullCmd: string) => {
    if (!session || !user || isProcessing) return;

    setIsProcessing(true);
    const response = kernel.process(fullCmd);

    // Update local state based on kernel response
    if (response.intent === 'file' && response.status === 'success') {
      if (response.data?.currentDir) {
        setCurrentDir(response.data.currentDir);
      }
      setFs(kernel.getFs());
    }

    if (response.intent === 'app' && response.status === 'success') {
      const { appId } = response.data;
      openWindow(appId, appId.charAt(0).toUpperCase() + appId.slice(1), <Activity className="w-4 h-4" />);
    }

    if (response.intent === 'ui' && response.status === 'success') {
      const { action, desktopId } = response.data;
      if (action === 'switch_desktop') {
        setCurrentDesktopId(desktopId);
      }
    }

    if (response.intent === 'cloud_sync' && response.status === 'success') {
      const syncData = response.data;
      const newSyncId = Math.random().toString(36).substr(2, 9);
      
      const newSyncItem = {
        id: newSyncId,
        file: syncData.file || 'System State',
        provider: syncData.provider,
        action: syncData.action,
        status: 'syncing',
        progress: 0,
        timestamp: Date.now()
      };

      setSyncHistory(prev => [newSyncItem, ...prev]);
      openWindow('cloud_sync', 'Cloud Sync Engine', <Cloud className="w-4 h-4" />);

      // Simulate progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setSyncHistory(prev => prev.map(item => 
            item.id === newSyncId ? { ...item, progress: 100, status: 'synced' } : item
          ));
        } else {
          setSyncHistory(prev => prev.map(item => 
            item.id === newSyncId ? { ...item, progress } : item
          ));
        }
      }, 300);
    }

    setLastOutput(response.output);
    setIsProcessing(false);

    // Log to Firestore
    try {
      await addDoc(collection(db, 'logs'), {
        userId: user.uid,
        command: fullCmd,
        output: response.output,
        intent: response.intent,
        status: response.status,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'logs');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Shield className="w-12 h-12 text-emerald-500" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-emerald-500 font-mono flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#111] border border-emerald-500/20 rounded-lg p-8 shadow-2xl shadow-emerald-500/5"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-emerald-500/10 rounded-full">
              <Lock className="w-12 h-12" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2 tracking-tighter">CYBERLAB TERMINAL</h1>
          <p className="text-emerald-500/60 text-center text-sm mb-8">Secure Access Required</p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-xs">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-3 bg-emerald-500 text-black font-bold rounded hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <Shield className="w-5 h-5" />
              </motion.div>
            ) : (
              <Globe className="w-5 h-5" />
            )}
            {isLoggingIn ? 'AUTHENTICATING...' : 'INITIALIZE AUTHENTICATION'}
          </button>
          
          <div className="mt-8 pt-6 border-t border-emerald-500/10 text-[10px] text-emerald-500/40 uppercase tracking-widest text-center">
            Authorized Personnel Only
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000500] text-[#00FF41] font-mono flex flex-col overflow-hidden">
      {/* Desktop Area */}
      <main className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_#001500_0%,_#000000_100%)]">
        {/* Desktop Icons */}
        <div className="absolute top-4 left-4 grid grid-cols-1 gap-4 z-0">
          <button 
            onDoubleClick={() => openWindow('terminal', 'Terminal', <TerminalIcon2 className="w-4 h-4" />)}
            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-[#00FF41]/10 group transition-all w-20"
          >
            <div className="p-3 bg-[#00FF41]/10 rounded-lg border border-[#00FF41]/20 group-hover:border-[#00FF41]/40">
              <TerminalIcon2 className="w-8 h-8" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-center">Terminal</span>
          </button>
          <button 
            onDoubleClick={() => openWindow('files', 'File Explorer', <Folder className="w-4 h-4" />)}
            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-[#00FF41]/10 group transition-all w-20"
          >
            <div className="p-3 bg-[#00FF41]/10 rounded-lg border border-[#00FF41]/20 group-hover:border-[#00FF41]/40">
              <Folder className="w-8 h-8" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-center">Files</span>
          </button>
          <button 
            onDoubleClick={() => openWindow('monitor', 'System Monitor', <Activity className="w-4 h-4" />)}
            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-[#00FF41]/10 group transition-all w-20"
          >
            <div className="p-3 bg-[#00FF41]/10 rounded-lg border border-[#00FF41]/20 group-hover:border-[#00FF41]/40">
              <Activity className="w-8 h-8" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-center">Monitor</span>
          </button>
          <button 
            onDoubleClick={() => openWindow('network', 'Network Tools', <Globe className="w-4 h-4" />)}
            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-[#00FF41]/10 group transition-all w-20"
          >
            <div className="p-3 bg-[#00FF41]/10 rounded-lg border border-[#00FF41]/20 group-hover:border-[#00FF41]/40">
              <Globe className="w-8 h-8" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-center">Network</span>
          </button>
          <button 
            onDoubleClick={() => openWindow('cloud_sync', 'Cloud Sync Engine', <Cloud className="w-4 h-4" />)}
            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-[#00FF41]/10 group transition-all w-20"
          >
            <div className="p-3 bg-[#00FF41]/10 rounded-lg border border-[#00FF41]/20 group-hover:border-[#00FF41]/40">
              <Cloud className="w-8 h-8" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-center">Cloud</span>
          </button>
        </div>

        {/* Windows */}
        <AnimatePresence>
          {windows.filter(w => w.isOpen && w.desktopId === currentDesktopId).map(w => (
            <Window
              key={w.id}
              id={w.id}
              title={w.title}
              icon={w.icon}
              isFocused={w.isFocused}
              isMinimized={w.isMinimized}
              isMaximized={w.isMaximized}
              zIndex={w.zIndex}
              onClose={() => closeWindow(w.id)}
              onFocus={() => focusWindow(w.id)}
              onMinimize={() => minimizeWindow(w.id)}
              onToggleMaximize={() => toggleMaximizeWindow(w.id)}
            >
              {w.id === 'terminal' && (
                <div className="flex-1 flex flex-col h-full">
                  {!session ? (
                    <div className="flex-1 flex items-center justify-center p-4">
                      <button
                        onClick={startSession}
                        className="px-8 py-3 bg-[#00FF41] text-black font-bold rounded hover:bg-[#00FF41]/80 transition-all flex items-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        INITIATE SESSION
                      </button>
                    </div>
                  ) : (
                    <XTermTerminal 
                      onCommand={executeCommand}
                      output={lastOutput}
                      prompt={`\x1b[1;32mrisecyber@ubuntu\x1b[0m:\x1b[1;34m${currentDir === '/home/risecyber' ? '~' : currentDir}\x1b[0m$ `}
                      isProcessing={isProcessing}
                    />
                  )}
                </div>
              )}
              {w.id === 'network' && (
                <NetworkTools />
              )}
              {w.id === 'cloud_sync' && (
                <CloudSync 
                  syncHistory={syncHistory} 
                  onClearHistory={() => setSyncHistory([])} 
                />
              )}
              {w.id === 'files' && (
                <div className="p-4 h-full overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-2 text-xs mb-4 text-[#00FF41]/60">
                    <Folder className="w-3 h-3" />
                    <span>{currentDir}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {Object.entries(fs).filter(([path]) => {
                      const parent = path.substring(0, path.lastIndexOf('/')) || '/';
                      return parent === currentDir && path !== currentDir;
                    }).map(([path, item]: [string, any]) => (
                      <div key={path} className="flex flex-col items-center gap-2 p-2 rounded hover:bg-[#00FF41]/10 cursor-pointer">
                        {item.type === 'dir' ? <Folder className="w-10 h-10" /> : <Database className="w-10 h-10" />}
                        <span className="text-[10px] truncate w-full text-center">{path.split('/').pop()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {w.id === 'monitor' && (
                <div className="p-6 h-full overflow-y-auto custom-scrollbar space-y-8">
                  <div>
                    <h3 className="text-xs font-bold mb-4 flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      CPU LOAD HISTORY
                    </h3>
                    <div className="h-32 bg-black/50 rounded border border-[#00FF41]/20 p-4 flex items-end gap-1">
                      {[...Array(40)].map((_, i) => (
                        <motion.div 
                          key={i}
                          className="flex-1 bg-[#00FF41]/40"
                          animate={{ height: `${Math.random() * 100}%` }}
                          transition={{ repeat: Infinity, duration: 1, delay: i * 0.05 }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-[#00FF41]/5 border border-[#00FF41]/20 rounded-lg">
                      <div className="text-[10px] text-[#00FF41]/40 mb-1 uppercase tracking-widest">Memory Usage</div>
                      <div className="text-2xl font-bold">2.4 GB / 8.0 GB</div>
                      <div className="mt-2 h-1 bg-[#00FF41]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00FF41] w-[30%]" />
                      </div>
                    </div>
                    <div className="p-4 bg-[#00FF41]/5 border border-[#00FF41]/20 rounded-lg">
                      <div className="text-[10px] text-[#00FF41]/40 mb-1 uppercase tracking-widest">Disk Activity</div>
                      <div className="text-2xl font-bold">12.4 MB/s</div>
                      <div className="mt-2 h-1 bg-[#00FF41]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00FF41] w-[15%]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Window>
          ))}
        </AnimatePresence>
      </main>

      {/* Taskbar */}
      <footer className="h-12 bg-[#000500] border-t border-[#00FF41]/20 flex items-center px-2 gap-1 z-[100]">
        <button 
          className="p-2 mr-2 rounded hover:bg-[#00FF41]/20 transition-all text-[#00FF41]"
          title="Start Menu"
        >
          <Layout className="w-5 h-5" />
        </button>

        {/* Desktop Switcher */}
        <div className="flex items-center gap-1 px-2 border-r border-[#00FF41]/20 h-full mr-2">
          {DESKTOPS.map(desktop => (
            <button
              key={desktop.id}
              onClick={() => setCurrentDesktopId(desktop.id)}
              className={cn(
                "p-1.5 rounded transition-all flex items-center gap-2",
                currentDesktopId === desktop.id 
                  ? "bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/40" 
                  : "text-[#00FF41]/40 hover:bg-[#00FF41]/10 hover:text-[#00FF41]/60"
              )}
              title={desktop.name}
            >
              {desktop.icon}
              <span className="text-[8px] font-bold uppercase tracking-widest hidden lg:block">{desktop.id.replace('_', ' ')}</span>
            </button>
          ))}
        </div>
        
        <div className="flex-1 flex items-center gap-1">
          <TaskbarIcon 
            icon={<TerminalIcon2 className="w-4 h-4" />} 
            label="Terminal" 
            isActive={windows.find(w => w.id === 'terminal' && w.desktopId === currentDesktopId)?.isFocused || false}
            onClick={() => openWindow('terminal', 'Terminal', <TerminalIcon2 className="w-4 h-4" />)}
          />
          <TaskbarIcon 
            icon={<Folder className="w-4 h-4" />} 
            label="Files" 
            isActive={windows.find(w => w.id === 'files' && w.desktopId === currentDesktopId)?.isFocused || false}
            onClick={() => openWindow('files', 'File Explorer', <Folder className="w-4 h-4" />)}
          />
          <TaskbarIcon 
            icon={<Activity className="w-4 h-4" />} 
            label="Monitor" 
            isActive={windows.find(w => w.id === 'monitor' && w.desktopId === currentDesktopId)?.isFocused || false}
            onClick={() => openWindow('monitor', 'System Monitor', <Activity className="w-4 h-4" />)}
          />
          <TaskbarIcon 
            icon={<Globe className="w-4 h-4" />} 
            label="Network" 
            isActive={windows.find(w => w.id === 'network' && w.desktopId === currentDesktopId)?.isFocused || false}
            onClick={() => openWindow('network', 'Network Tools', <Globe className="w-4 h-4" />)}
          />
          <TaskbarIcon 
            icon={<Cloud className="w-4 h-4" />} 
            label="Cloud Sync" 
            isActive={windows.find(w => w.id === 'cloud_sync' && w.desktopId === currentDesktopId)?.isFocused || false}
            onClick={() => openWindow('cloud_sync', 'Cloud Sync Engine', <Cloud className="w-4 h-4" />)}
          />
        </div>

        <div className="flex items-center gap-4 px-4 border-l border-[#00FF41]/20 h-full">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold">{format(new Date(), 'HH:mm')}</span>
            <span className="text-[8px] text-[#00FF41]/60">{format(new Date(), 'dd/MM/yyyy')}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-red-500/20 text-[#00FF41]/60 hover:text-red-500 rounded transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 65, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 65, 0.2);
        }
      `}</style>
    </div>
  );
}

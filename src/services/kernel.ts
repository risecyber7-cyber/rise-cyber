import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SystemIntent = 'command' | 'app' | 'file' | 'system' | 'ui' | 'cloud_sync';

export interface KernelResponse {
  intent: SystemIntent;
  status: 'success' | 'error' | 'processing';
  output: string;
  data?: any;
  timestamp: number;
}

export interface FileSystemItem {
  type: 'file' | 'dir' | string;
  content?: string;
  children?: string[];
  permissions?: string;
  owner?: string;
}

export interface FileSystem {
  [path: string]: FileSystemItem;
}

export class Kernel {
  private fs: FileSystem;
  private currentDir: string;
  private user: string;

  constructor(initialFs: FileSystem, initialDir: string = '/home/risecyber', user: string = 'risecyber') {
    this.fs = initialFs;
    this.currentDir = initialDir;
    this.user = user;
  }

  public process(input: string): KernelResponse {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Determine intent
    if (this.isApp(cmd)) {
      return this.handleAppLaunch(cmd, args);
    }

    if (this.isFileSystemCommand(cmd)) {
      return this.handleFileSystem(cmd, args);
    }

    return this.handleCommand(cmd, args);
  }

  private isApp(cmd: string): boolean {
    const apps = ['terminal', 'files', 'monitor', 'network', 'settings', 'browser'];
    return apps.includes(cmd);
  }

  private isFileSystemCommand(cmd: string): boolean {
    const fsCmds = ['ls', 'cd', 'pwd', 'cat', 'mkdir', 'touch', 'rm', 'mv', 'cp'];
    return fsCmds.includes(cmd);
  }

  private handleAppLaunch(appId: string, args: string[]): KernelResponse {
    return {
      intent: 'app',
      status: 'success',
      output: `Launching ${appId}...`,
      data: { appId, args },
      timestamp: Date.now()
    };
  }

  private handleFileSystem(cmd: string, args: string[]): KernelResponse {
    let output = '';
    let status: 'success' | 'error' = 'success';
    let data: any = null;

    switch (cmd) {
      case 'pwd':
        output = this.currentDir;
        break;
      case 'ls':
        const target = args[0] || this.currentDir;
        const path = this.resolvePath(target);
        const item = this.fs[path];
        if (item && item.type === 'dir') {
          output = (item.children || []).join('  ');
          data = { path, children: item.children };
        } else {
          output = `ls: cannot access '${target}': No such file or directory`;
          status = 'error';
        }
        break;
      case 'cd':
        const dir = args[0] || '~';
        const newPath = this.resolvePath(dir === '~' ? `/home/${this.user}` : dir);
        if (this.fs[newPath] && this.fs[newPath].type === 'dir') {
          this.currentDir = newPath;
          output = `Changed directory to ${newPath}`;
          data = { currentDir: this.currentDir };
        } else {
          output = `cd: ${dir}: No such directory`;
          status = 'error';
        }
        break;
      case 'cat':
        const file = args[0];
        if (!file) {
          output = 'usage: cat <file>';
          status = 'error';
        } else {
          const filePath = this.resolvePath(file);
          const fileItem = this.fs[filePath];
          if (fileItem && fileItem.type === 'file') {
            output = fileItem.content || '';
          } else {
            output = `cat: ${file}: No such file`;
            status = 'error';
          }
        }
        break;
      default:
        output = `${cmd}: filesystem operation not fully implemented in kernel core`;
        status = 'error';
    }

    return {
      intent: 'file',
      status,
      output,
      data,
      timestamp: Date.now()
    };
  }

  private handleCommand(cmd: string, args: string[]): KernelResponse {
    if (cmd === 'nmap') {
      return {
        intent: 'app',
        status: 'success',
        output: 'Launching Network Tools for scanning...',
        data: { appId: 'network', args },
        timestamp: Date.now()
      };
    }

    if (cmd === 'desktop') {
      const desktopId = args[0];
      const validDesktops = ['default', 'dev', 'hacking_lab'];
      if (validDesktops.includes(desktopId)) {
        return {
          intent: 'ui',
          status: 'success',
          output: `Switching to desktop: ${desktopId}`,
          data: { action: 'switch_desktop', desktopId },
          timestamp: Date.now()
        };
      }
      return {
        intent: 'command',
        status: 'error',
        output: `Invalid desktop. Available: ${validDesktops.join(', ')}`,
        timestamp: Date.now()
      };
    }

    if (['upload', 'download', 'sync'].includes(cmd)) {
      const file = args[0];
      const provider = args[1] || 'web_os_cloud';
      const validProviders = ['web_os_cloud', 'gdrive', 'dropbox'];

      if (!file && cmd !== 'sync') {
        return {
          intent: 'command',
          status: 'error',
          output: `usage: ${cmd} <file> [provider]`,
          timestamp: Date.now()
        };
      }

      if (!validProviders.includes(provider)) {
        return {
          intent: 'command',
          status: 'error',
          output: `Invalid provider. Available: ${validProviders.join(', ')}`,
          timestamp: Date.now()
        };
      }

      const filePath = file ? this.resolvePath(file) : null;
      if (filePath && !this.fs[filePath]) {
        return {
          intent: 'command',
          status: 'error',
          output: `${cmd}: ${file}: No such file or directory`,
          timestamp: Date.now()
        };
      }

      return {
        intent: 'cloud_sync',
        status: 'success',
        output: `${cmd === 'upload' ? 'Uploading' : cmd === 'download' ? 'Downloading' : 'Syncing'} ${file || 'all files'} via ${provider}...`,
        data: {
          type: 'cloud_sync',
          action: cmd,
          file: filePath,
          provider,
          status: 'synced'
        },
        timestamp: Date.now()
      };
    }

    // Generic command handling
    return {
      intent: 'command',
      status: 'success',
      output: `Executed ${cmd} with args: ${args.join(', ')}`,
      timestamp: Date.now()
    };
  }

  private resolvePath(path: string): string {
    if (path === '/') return '/';
    if (path === '..') {
      const parts = this.currentDir.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }
    if (path === '.') return this.currentDir;
    
    const absolutePath = path.startsWith('/') 
      ? path 
      : (this.currentDir === '/' ? `/${path}` : `${this.currentDir}/${path}`);
    
    return absolutePath.replace(/\/+$/, '') || '/';
  }

  public getFs() { return this.fs; }
  public getCurrentDir() { return this.currentDir; }
}

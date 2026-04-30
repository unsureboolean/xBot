import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle, XCircle, RefreshCw, KeyRound, Server, AlertCircle } from 'lucide-react';

interface SingleBotStatus {
  isRunning: boolean;
  telegramTokenSet?: boolean;
  discordTokenSet?: boolean;
  openaiKeySet?: boolean;
  xaiKeySet?: boolean;
  clientId?: string | null;
}

interface CombinedBotStatus {
  telegram: SingleBotStatus;
  discord: SingleBotStatus;
}

export default function App() {
  const [status, setStatus] = useState<CombinedBotStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching status', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 flex items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase tracking-wider">Multi-Platform Bot Control</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Server Status & Configuration</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && !status ? (
          <div className="flex items-center gap-2 text-indigo-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm font-mono">Fetching status...</span>
          </div>
        ) : status ? (
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Status Card - Telegram */}
            <div className={`p-6 rounded-2xl border ${status.telegram.isRunning ? 'border-blue-500/30 bg-[#111112] shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-red-500/30 bg-[#111112] shadow-[0_0_15px_rgba(239,68,68,0.1)]'}`}>
              <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
                <Server className={`w-4 h-4 ${status.telegram.isRunning ? 'text-blue-400' : 'text-red-400'}`} />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Telegram Bot Server</h2>
              </div>
              
              <div className="flex items-center gap-3 mb-2">
                {status.telegram.isRunning ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span className="text-2xl font-light text-white">Online & Polling</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-2xl font-light text-white">Offline</span>
                  </>
                )}
              </div>
              
              {!status.telegram.isRunning && (
                <p className="text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-lg text-xs leading-relaxed mt-4">
                  Check your TELEGRAM_BOT_TOKEN environment variable. If you haven't set it in the AI Studio settings, the bot cannot start.
                </p>
              )}
            </div>

            {/* Status Card - Discord */}
            <div className={`p-6 rounded-2xl border ${status.discord.isRunning ? 'border-indigo-500/30 bg-[#111112] shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'border-red-500/30 bg-[#111112] shadow-[0_0_15px_rgba(239,68,68,0.1)]'}`}>
              <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
                <Server className={`w-4 h-4 ${status.discord.isRunning ? 'text-indigo-400' : 'text-red-400'}`} />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Discord Bot Server</h2>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {status.discord.isRunning ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-indigo-400" />
                      <span className="text-2xl font-light text-white">Online & Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="text-2xl font-light text-white">Offline</span>
                    </>
                  )}
                </div>
              </div>

              {status.discord.clientId && status.discord.isRunning && (
                <div className="mt-4">
                  <a
                    href={`https://discord.com/api/oauth2/authorize?client_id=${status.discord.clientId}&permissions=8&scope=bot`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/40 transition-colors uppercase tracking-widest"
                  >
                    Invite to Server
                  </a>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Note: If the bot is not responding to commands, ensure "Privileged Gateway Intents" (Message Content Intent) are enabled in the Discord Developer Portal.
                  </p>
                </div>
              )}
              
              {!status.discord.isRunning && (
                <p className="text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-lg text-xs leading-relaxed mt-4">
                  Check your DISCORD_BOT_TOKEN environment variable. If you haven't set it in the AI Studio settings, the bot cannot start.
                </p>
              )}
            </div>

            {/* Keys Card */}
            <div className="p-6 md:col-span-2 rounded-2xl border border-white/5 bg-[#111112]">
              <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
                <KeyRound className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Platform Keys</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300 font-medium">Telegram Token</span>
                  {status.telegram.telegramTokenSet ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20 uppercase"><CheckCircle className="w-3 h-3" /> Set</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20 uppercase"><AlertCircle className="w-3 h-3" /> Missing</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300 font-medium">Discord Token</span>
                  {status.discord.discordTokenSet ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20 uppercase"><CheckCircle className="w-3 h-3" /> Set</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20 uppercase"><AlertCircle className="w-3 h-3" /> Missing</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300 font-medium flex flex-col">OpenAI API Key <span className="text-[10px] text-slate-500 font-mono mt-0.5">(for GPT-4o / GPT-5.4)</span></span>
                  {status.telegram.openaiKeySet ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20 uppercase"><CheckCircle className="w-3 h-3" /> Set</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20 uppercase"><AlertCircle className="w-3 h-3" /> Missing</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300 font-medium flex flex-col">xAI API Key <span className="text-[10px] text-slate-500 font-mono mt-0.5">(for Grok-4)</span></span>
                  {status.telegram.xaiKeySet ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20 uppercase"><CheckCircle className="w-3 h-3" /> Set</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20 uppercase"><AlertCircle className="w-3 h-3" /> Missing</span>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-red-500/20 bg-[#111112] text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Cannot connect to the local API.</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-6 rounded-2xl bg-[#111112] border border-white/5">
          <div className="border-b border-white/5 pb-4 mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">How to use</h3>
          </div>
          <ol className="list-decimal list-inside text-sm text-slate-400 space-y-3">
            <li>Ensure you have set <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-indigo-400 text-xs shadow-sm">TELEGRAM_BOT_TOKEN</code> or <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-indigo-400 text-xs shadow-sm">DISCORD_BOT_TOKEN</code> in your AI Studio settings.</li>
            <li>Message your bot on Telegram or Discord and use <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-indigo-400 text-xs shadow-sm">/start</code> or <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-indigo-400 text-xs shadow-sm">/help</code></li>
            <li>Switch to OpenAI (if configured) with <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-indigo-400 text-xs shadow-sm">/openai</code></li>
            <li>Switch to xAI (Grok-4) with <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-indigo-400 text-xs shadow-sm">/grok</code> (default)</li>
            <li>Activate Frank Reynolds persona with <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-indigo-400 text-xs shadow-sm">/frank</code></li>
            <li>Activate Anime Waifu persona with <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-indigo-400 text-xs shadow-sm">/waifu</code></li>
            <li>Generate images via <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-indigo-400 text-xs shadow-sm">/image a retro futuristic city</code></li>
            <li>Use reasoning via <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-indigo-400 text-xs shadow-sm">/reason How many Rs in strawberry?</code></li>
          </ol>
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={fetchStatus}
              className="group flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-md bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(79,70,229,0.6)] active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              REFRESH STATUS
            </button>
        </div>
      </div>
    </div>
  );
}


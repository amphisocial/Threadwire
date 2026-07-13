import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  FileText, GitBranch, ArrowRight, ChevronRight, Sparkles, Upload,
  Check, X, Pencil, Link2, Inbox, Clock, Bot, ShieldCheck, Layers,
  FlaskConical, ScrollText, Zap,
} from "lucide-react";

/* =========================================================================
   ThreadWire — AI Workbench
   A home for purpose-built AI agents. Each agent runs a curated,
   admin-owned prompt over engineer-supplied source material, and lets the
   engineer accept / reject / refine every result before export.

   Two agents ship in this build:
     1. Requirements Extractor  — pulls candidate requirements from documents
     2. Derivation Assistant    — decomposes parent requirements into children

   Integration seams are isolated in `Services`; swap the offline engines for
   real LLM / Jama / DOORS endpoints without touching the UI.
   ========================================================================= */

/* ----------------------------- scoped styles ---------------------------- */
const WBStyles = () => (
  <style>{`
  .wb{ --wb-brand:#2A46C4; --wb-brand-ink:#1B2E8C; --wb-brand-wash:#E9EDFB;
       --wb-ok:#12784E; --wb-ok-wash:#E2F1E9; --wb-ok-line:#A9D6C0;
       --wb-no:#AC3247; --wb-no-wash:#F9E8EC; --wb-no-line:#E6B7C0;
       --wb-ai:#B27C12; --wb-ai-2:#8f6410; --wb-ai-wash:#FAF2DD; --wb-ai-line:#E7CF97;
       font-family:var(--body); color:var(--ink); }
  .wb *{box-sizing:border-box}
  .wb-mono{font-family:var(--mono)}

  .wb-tool-head{display:flex;align-items:flex-start;gap:16px;margin-bottom:22px}
  .wb-tool-head .ic{width:52px;height:52px;border-radius:14px;background:var(--wb-brand-wash);display:grid;place-items:center;color:var(--wb-brand);flex:none}
  .wb-tool-head h1{font-family:var(--disp);font-weight:800;font-size:30px;margin:0 0 4px;letter-spacing:-.02em}
  .wb-tool-head p{color:var(--muted);margin:0;font-size:14.5px;max-width:720px;line-height:1.55}

  /* agent gallery */
  .wb-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
  .wb-agent{position:relative;text-align:left;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:22px;transition:.18s;cursor:pointer;display:flex;flex-direction:column;min-height:196px}
  .wb-agent:hover{border-color:var(--wb-brand);box-shadow:0 18px 44px -26px rgba(42,70,196,.5);transform:translateY(-3px)}
  .wb-agent.locked{cursor:default;opacity:.72}
  .wb-agent.locked:hover{transform:none;border-color:var(--line);box-shadow:none}
  .wb-agent .ai{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;margin-bottom:14px;flex:none}
  .wb-agent h3{font-family:var(--disp);font-weight:700;font-size:17px;margin:0 0 6px}
  .wb-agent p{margin:0;font-size:13px;color:var(--muted);line-height:1.5;flex:1}
  .wb-agent .row{display:flex;align-items:center;gap:8px;margin-top:14px}
  .wb-agent .open{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--wb-brand)}
  .wb-badge{font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:6px;font-weight:600}
  .wb-badge.live{background:var(--wb-ok-wash);color:var(--wb-ok)}
  .wb-badge.next{background:var(--wb-ai-wash);color:var(--wb-ai-2)}
  .wb-badge.soon{background:var(--inset);color:var(--faint)}
  .wb-skill{font-family:var(--mono);font-size:10.5px;color:var(--muted);background:var(--inset);border:1px solid var(--line);padding:2px 7px;border-radius:5px}

  .wb-back{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--muted);cursor:pointer;font-weight:500;margin-bottom:16px;background:none;border:none;font-family:var(--body)}
  .wb-back:hover{color:var(--ink)}

  /* stepper */
  .wb-stepper{display:flex;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:6px;margin-bottom:22px}
  .wb-step{flex:1;display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:9px;color:var(--faint);font-weight:500;font-size:13.5px}
  .wb-step .n{width:23px;height:23px;border-radius:50%;border:1.5px solid var(--line2);display:grid;place-items:center;font-family:var(--mono);font-size:11px;flex:none}
  .wb-step.on{background:var(--wb-brand-wash);color:var(--wb-brand-ink)}
  .wb-step.on .n{border-color:var(--wb-brand);background:var(--wb-brand);color:#fff}
  .wb-step.done .n{border-color:var(--wb-ok);background:var(--wb-ok-wash);color:var(--wb-ok)}
  .wb-step.clickable{cursor:pointer}
  .wb-step-arrow{color:var(--line2);flex:none;display:flex}

  /* panels */
  .wb-panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;margin-bottom:18px}
  .wb-panel-head{padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px}
  .wb-panel-head h3{font-family:var(--disp);font-weight:700;font-size:15px;margin:0}
  .wb-panel-head .cnt{font-family:var(--mono);font-size:11px;color:var(--faint);margin-left:auto}
  .wb-panel-pad{padding:20px}

  /* dropzone / paste */
  .wb-drop{border:1.5px dashed var(--line2);border-radius:12px;padding:28px;text-align:center;background:var(--panel2);cursor:pointer;transition:.15s}
  .wb-drop.drag{border-color:var(--wb-brand);background:var(--wb-brand-wash)}
  .wb-drop .dic{width:46px;height:46px;border-radius:11px;background:var(--panel);border:1px solid var(--line);display:grid;place-items:center;margin:0 auto 10px;color:var(--wb-brand)}
  .wb-drop h4{font-family:var(--disp);font-weight:700;margin:0 0 4px;font-size:15px}
  .wb-drop p{color:var(--muted);margin:0;font-size:13px}
  .wb-drop .fmt{margin-top:9px;font-family:var(--mono);font-size:11px;color:var(--faint)}
  .wb-paste{width:100%;border:1px solid var(--line2);border-radius:10px;padding:12px;font-size:13px;line-height:1.6;min-height:96px;resize:vertical;background:var(--panel);font-family:var(--body);color:var(--ink)}
  .wb-paste:focus{outline:none;border-color:var(--wb-brand)}
  .wb-orline{display:flex;align-items:center;gap:12px;margin:16px 0;color:var(--faint);font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
  .wb-orline::before,.wb-orline::after{content:"";height:1px;background:var(--line);flex:1}

  .wb-filelist{display:flex;flex-direction:column;gap:8px;margin-top:14px}
  .wb-file{display:flex;align-items:center;gap:12px;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--panel2)}
  .wb-file .fi{width:34px;height:34px;border-radius:8px;background:var(--wb-brand-wash);color:var(--wb-brand);display:grid;place-items:center;font-family:var(--mono);font-size:9.5px;font-weight:700;flex:none}
  .wb-file .meta{flex:1;min-width:0}
  .wb-file .fn{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .wb-file .fs{font-family:var(--mono);font-size:11px;color:var(--faint)}
  .wb-file .st{font-family:var(--mono);font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:5px}
  .wb-file .st.ok{color:var(--wb-ok)} .wb-file .st.err{color:var(--wb-no)} .wb-file .st.busy{color:var(--wb-ai-2)}
  .wb-file .rm{width:26px;height:26px;border-radius:7px;border:1px solid var(--line);display:grid;place-items:center;color:var(--faint);background:var(--panel);cursor:pointer;flex:none}
  .wb-file .rm:hover{border-color:var(--wb-no-line);color:var(--wb-no);background:var(--wb-no-wash)}

  /* feed / select list */
  .wb-feed{display:flex;align-items:center;gap:13px}
  .wb-feed .fb{width:38px;height:38px;border-radius:9px;background:var(--wb-ok-wash);color:var(--wb-ok);display:grid;place-items:center;border:1px solid var(--wb-ok-line);flex:none}
  .wb-selecthead{display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid var(--line);background:var(--panel2)}
  .wb-selecthead .lft{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
  .wb-selectlist{display:flex;flex-direction:column;max-height:420px;overflow:auto}
  .wb-selrow{display:flex;align-items:flex-start;gap:13px;padding:13px 18px;border-bottom:1px solid var(--line);cursor:pointer}
  .wb-selrow:last-child{border-bottom:none}
  .wb-selrow:hover{background:var(--panel2)}
  .wb-selrow.sel{background:var(--wb-brand-wash)}
  .wb-cb{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--line2);flex:none;display:grid;place-items:center;margin-top:1px;background:var(--panel);transition:.12s;color:#fff}
  .wb-selrow.sel .wb-cb{background:var(--wb-brand);border-color:var(--wb-brand)}
  .wb-selrow .rid{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--wb-brand-ink);flex:none;min-width:82px}
  .wb-selrow .rt{flex:1;font-size:13.5px;line-height:1.5;color:var(--ink)}
  .wb-selrow .rmeta{font-family:var(--mono);font-size:11px;color:var(--faint);flex:none}

  /* source tabs */
  .wb-srctabs{display:flex;gap:8px;margin-bottom:18px}
  .wb-srctab{flex:1;padding:15px;border:1px solid var(--line);border-radius:12px;background:var(--panel);text-align:left;transition:.15s;cursor:pointer}
  .wb-srctab:hover{border-color:var(--wb-brand)}
  .wb-srctab.on{border-color:var(--wb-brand);background:var(--wb-brand-wash);box-shadow:0 0 0 1px var(--wb-brand)}
  .wb-srctab .si{width:32px;height:32px;border-radius:8px;background:var(--inset);display:grid;place-items:center;color:var(--muted);margin-bottom:10px}
  .wb-srctab.on .si{background:var(--panel);color:var(--wb-brand)}
  .wb-srctab h4{font-family:var(--disp);font-weight:700;font-size:13.5px;margin:0 0 3px}
  .wb-srctab p{margin:0;font-size:12px;color:var(--muted)}

  /* prompt strip */
  .wb-promptbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 18px;background:var(--wb-ai-wash);border:1px solid var(--wb-ai-line);border-radius:12px;margin-bottom:18px}
  .wb-promptbar .lft{display:flex;align-items:center;gap:12px}
  .wb-ai-badge{width:32px;height:32px;border-radius:8px;background:var(--panel);border:1px solid var(--wb-ai-line);display:grid;place-items:center;color:var(--wb-ai);flex:none}
  .wb-promptbar .t1{font-weight:700;font-size:13.5px;color:var(--wb-ai-2)}
  .wb-promptbar .t2{font-family:var(--mono);font-size:11px;color:#9a7a2e}
  .wb-prompt-editor{margin-bottom:18px;border:1px solid var(--wb-ai-line);border-radius:12px;overflow:hidden}
  .wb-pe-head{background:var(--wb-ai-wash);padding:11px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--wb-ai-line)}
  .wb-pe-head .t{display:flex;align-items:center;gap:10px;font-weight:700;font-size:13px;color:var(--wb-ai-2)}
  .wb-prompt-editor textarea{width:100%;border:none;padding:15px;font-family:var(--mono);font-size:12.5px;line-height:1.7;color:var(--ink);resize:vertical;min-height:150px;background:var(--panel)}
  .wb-prompt-editor textarea:focus{outline:none}
  .wb-pe-foot{padding:10px 16px;border-top:1px solid var(--wb-ai-line);display:flex;align-items:center;justify-content:space-between;background:var(--panel);flex-wrap:wrap;gap:8px}
  .wb-pe-foot .note{font-family:var(--mono);font-size:11px;color:var(--faint)}
  .wb-varchip{font-family:var(--mono);font-size:11px;background:var(--panel);border:1px solid var(--wb-ai-line);color:var(--wb-ai-2);padding:2px 7px;border-radius:5px}

  /* context panel (derivation) */
  .wb-ctx{border:1px solid var(--wb-ai-line);border-radius:12px;overflow:hidden;margin-bottom:18px;background:var(--panel)}
  .wb-ctx .h{background:var(--wb-ai-wash);padding:15px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--wb-ai-line)}
  .wb-ctx .h h3{font-family:var(--disp);font-size:15px;margin:0;color:var(--wb-ai-2);font-weight:700}
  .wb-ctx .h p{margin:2px 0 0;font-size:12.5px;color:#9a7a2e}
  .wb-ctx .b{padding:18px}
  .wb-cq{margin-bottom:16px}
  .wb-cq:last-child{margin-bottom:0}
  .wb-cq label{display:block;font-size:13px;font-weight:500;margin-bottom:6px;color:var(--ink)}
  .wb-cq label .why{font-family:var(--mono);font-size:11px;color:var(--wb-ai-2);font-weight:400;margin-left:6px}
  .wb-cq input{width:100%;border:1px solid var(--wb-ai-line);border-radius:8px;padding:9px 12px;background:var(--panel);color:var(--ink)}
  .wb-cq input:focus{outline:none;border-color:var(--wb-ai)}
  .wb-cq .trig{font-family:var(--mono);font-size:11px;color:var(--faint);margin-top:5px;display:flex;align-items:center;gap:5px}

  /* triage */
  .wb-triage{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}
  .wb-chip{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:8px;font-size:12.5px;font-weight:600;border:1px solid var(--line)}
  .wb-chip .dot{width:8px;height:8px;border-radius:50%}
  .wb-chip.pend{background:var(--wb-ai-wash);border-color:var(--wb-ai-line);color:var(--wb-ai-2)} .wb-chip.pend .dot{background:var(--wb-ai)}
  .wb-chip.ok{background:var(--wb-ok-wash);border-color:var(--wb-ok-line);color:var(--wb-ok)} .wb-chip.ok .dot{background:var(--wb-ok)}
  .wb-chip.no{background:var(--wb-no-wash);border-color:var(--wb-no-line);color:var(--wb-no)} .wb-chip.no .dot{background:var(--wb-no)}
  .wb-filters{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
  .wb-filters button{padding:6px 12px;font-size:12.5px;font-weight:500;color:var(--muted);border-right:1px solid var(--line);background:var(--panel);cursor:pointer;font-family:var(--body)}
  .wb-filters button:last-child{border-right:none}
  .wb-filters button.on{background:var(--wb-brand);color:#fff}

  .wb-grouphead{display:flex;align-items:center;gap:10px;margin:22px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
  .wb-grouphead .pid{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--wb-brand-ink);background:var(--wb-brand-wash);padding:3px 9px;border-radius:6px}
  .wb-grouphead .pt{font-size:13px;color:var(--muted);flex:1}
  .wb-grouphead .pc{font-family:var(--mono);font-size:11px;color:var(--faint)}

  .wb-card{display:grid;grid-template-columns:5px 1fr;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:12px}
  .wb-card .rail{background:var(--wb-ai)}
  .wb-card.ok{border-color:var(--wb-ok-line)} .wb-card.ok .rail{background:var(--wb-ok)}
  .wb-card.no{opacity:.6} .wb-card.no .rail{background:var(--wb-no)}
  .wb-card .cbody{padding:15px 18px}
  .wb-card .top{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
  .wb-card .rid{font-family:var(--mono);font-size:12px;font-weight:600;background:var(--inset);padding:3px 9px;border-radius:6px;color:var(--ink)}
  .wb-mini{font-family:var(--mono);font-size:10px;letter-spacing:.05em;text-transform:uppercase;padding:3px 7px;border-radius:5px;font-weight:600}
  .wb-mini.type{background:var(--wb-brand-wash);color:var(--wb-brand-ink)}
  .wb-mini.ver{background:var(--inset);color:var(--muted)}
  .wb-mini.status{background:var(--wb-ai-wash);color:var(--wb-ai-2)}
  .wb-mini.flag{background:var(--wb-no-wash);color:var(--wb-no)}
  .wb-mini.edited{background:var(--wb-brand-wash);color:var(--wb-brand)}
  .wb-card .stl{margin-left:auto;font-family:var(--mono);font-size:11px;font-weight:600;color:var(--wb-ai-2);display:flex;align-items:center;gap:6px}
  .wb-card.ok .stl{color:var(--wb-ok)} .wb-card.no .stl{color:var(--wb-no)}
  .wb-card .reqtext{font-size:14.5px;line-height:1.55;color:var(--ink)}
  .wb-card.no .reqtext{text-decoration:line-through;text-decoration-color:var(--wb-no-line);color:var(--muted)}
  .wb-card .reqtext b{font-weight:700;color:var(--wb-brand-ink)}
  .wb-card textarea.edit{width:100%;border:1px solid var(--wb-brand);border-radius:8px;padding:11px;font-size:14px;line-height:1.55;resize:vertical;min-height:74px;margin-top:2px;background:var(--wb-brand-wash);color:var(--ink);font-family:var(--body)}
  .wb-card textarea.edit:focus{outline:2px solid var(--wb-brand-wash)}
  .wb-rationale{margin-top:12px;padding:11px 13px;background:var(--wb-ai-wash);border:1px solid var(--wb-ai-line);border-radius:8px;font-size:12.5px;line-height:1.55;color:var(--muted)}
  .wb-rationale .h{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--wb-ai-2);font-weight:700;margin-right:6px}
  .wb-origin{display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap}
  .wb-origin .s{font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:7px}
  .wb-origin a{color:var(--wb-brand);text-decoration:none;font-weight:600;cursor:pointer;font-size:12.5px}
  .wb-origin a:hover{text-decoration:underline}
  .wb-origin .spacer,.wb-foot .spacer{flex:1}
  .wb-foot{display:flex;align-items:center;gap:14px;margin-top:12px}
  .wb-foot .trace{font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:7px}
  .wb-foot .trace a{color:var(--wb-brand);text-decoration:none;font-weight:600;cursor:pointer}
  .wb-actions{display:flex;gap:8px}
  .wb-act{width:34px;height:34px;border-radius:8px;border:1px solid var(--line);display:grid;place-items:center;color:var(--muted);transition:.12s;background:var(--panel);cursor:pointer}
  .wb-act:hover{background:var(--inset)}
  .wb-act.a-ok:hover{background:var(--wb-ok-wash);color:var(--wb-ok);border-color:var(--wb-ok-line)}
  .wb-act.a-no:hover{background:var(--wb-no-wash);color:var(--wb-no);border-color:var(--wb-no-line)}
  .wb-act.a-edit:hover{background:var(--wb-brand-wash);color:var(--wb-brand);border-color:var(--wb-brand)}
  .wb-act.on-ok{background:var(--wb-ok);color:#fff;border-color:var(--wb-ok)}
  .wb-act.on-no{background:var(--wb-no);color:#fff;border-color:var(--wb-no)}

  .wb-reqimg{display:flex;gap:12px;align-items:center;margin-top:12px;padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--panel2)}
  .wb-reqimg .thumb{width:88px;height:57px;border-radius:6px;overflow:hidden;flex:none;border:1px solid var(--line)}
  .wb-reqimg .cap{font-size:12px;color:var(--muted)}
  .wb-reqimg .cap b{color:var(--ink)}
  .wb-reqimg .cap .wb-mono{display:block;font-size:10.5px;color:var(--faint);margin-top:2px}

  .wb-empty{text-align:center;padding:44px;color:var(--faint)}
  .wb-empty svg{margin-bottom:12px;opacity:.5}

  /* export */
  .wb-exp-summary{display:flex;gap:22px;flex-wrap:wrap;background:var(--panel2);border:1px solid var(--line);border-radius:11px;padding:16px 18px;margin-bottom:18px}
  .wb-exp-summary .k{font-family:var(--mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);display:block;margin-bottom:3px}
  .wb-exp-summary .v{font-weight:700;font-size:16px;color:var(--ink)}
  .wb-export-opt{display:flex;align-items:center;gap:13px;padding:14px;border:1px solid var(--line);border-radius:11px;margin-bottom:10px;cursor:pointer;transition:.12s;background:var(--panel)}
  .wb-export-opt:hover{border-color:var(--wb-brand);background:var(--wb-brand-wash)}
  .wb-export-opt .ei{width:40px;height:40px;border-radius:9px;background:var(--inset);display:grid;place-items:center;flex:none;font-family:var(--mono);font-size:10px;font-weight:700;color:var(--muted)}
  .wb-export-opt:hover .ei{background:var(--panel);color:var(--wb-brand)}
  .wb-export-opt .n{font-weight:700;font-size:13.5px}
  .wb-export-opt .d{font-size:12px;color:var(--muted)}
  .wb-export-opt .go{color:var(--faint);margin-left:auto}

  /* action bar */
  .wb-actionbar{position:sticky;bottom:0;background:var(--panel);border-top:1px solid var(--line);padding:14px 4px;display:flex;align-items:center;gap:14px;margin:0 -4px;border-radius:0 0 4px 4px}
  .wb-actionbar .sum{font-size:13px;color:var(--muted)} .wb-actionbar .sum b{color:var(--ink);font-weight:700}

  /* run overlay */
  .wb-run{display:flex;flex-direction:column;align-items:center;gap:14px;padding:52px;text-align:center}
  .wb-run .big{width:44px;height:44px;border:3px solid var(--wb-brand-wash);border-top-color:var(--wb-brand);border-radius:50%;animation:wbsp .8s linear infinite}
  .wb-run h4{font-family:var(--disp);margin:0;font-size:16px;font-weight:700}
  .wb-run p{margin:0;color:var(--muted);font-size:13px}
  .wb-spin{width:14px;height:14px;border:2px solid var(--line2);border-top-color:var(--wb-brand);border-radius:50%;animation:wbsp .7s linear infinite;display:inline-block}
  @keyframes wbsp{to{transform:rotate(360deg)}}

  .wb-stub{font-family:var(--mono);font-size:10.5px;color:var(--wb-ai-2);background:var(--wb-ai-wash);border:1px solid var(--wb-ai-line);padding:2px 8px;border-radius:5px;display:inline-flex;align-items:center;gap:5px}

  /* toast */
  .wb-toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--ink);color:#fff;padding:13px 20px;border-radius:11px;box-shadow:0 12px 40px rgba(21,34,45,.25);display:flex;align-items:center;gap:11px;font-size:13.5px;font-weight:500;opacity:0;pointer-events:none;transition:.25s;z-index:300}
  .wb-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}

  @media(max-width:760px){.wb-srctabs{flex-direction:column}.wb-stepper{flex-wrap:wrap}}
  `}</style>
);

/* ----------------------------- utilities -------------------------------- */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = (v) => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const fileExt = (name) => { const m = name.toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ""; };
const sizeLabel = (b) => (b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB");
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script"); s.src = src;
    s.onload = res; s.onerror = () => rej(new Error("load failed"));
    document.head.appendChild(s);
  });
}
// Split a highlighted "shall"/"shall not" string into React nodes (no dangerouslySetInnerHTML)
function renderHighlighted(text) {
  const parts = String(text).split(/(\bshall not\b|\bshall\b|\bmust\b|\bis required to\b)/gi);
  return parts.map((p, i) =>
    /^(shall not|shall|must|is required to)$/i.test(p) ? <b key={i}>{p}</b> : <span key={i}>{p}</span>
  );
}

/* =============================== AGENTS ================================= */
const AGENTS = [
  {
    key: "extractor", name: "Requirements Extractor", badge: "live",
    icon: FileText, accent: "var(--wb-brand)", wash: "var(--wb-brand-wash)",
    tagline: "Pulls candidate requirements from specs, PDFs and emails — each with origin traceability and any referenced figure.",
    skills: ["Document parsing", "Classification", "Origin trace"],
  },
  {
    key: "derivation", name: "Derivation Assistant", badge: "live",
    icon: GitBranch, accent: "var(--wb-brand)", wash: "var(--wb-brand-wash)",
    tagline: "Decomposes parent requirements into traceable child requirements, each with the engineering rationale (budgets, apportionment, standards).",
    skills: ["Decomposition", "Apportionment", "Rationale"],
  },
  {
    key: "testgen", name: "Test Case Generator", badge: "next",
    icon: FlaskConical, accent: "var(--wb-ai)", wash: "var(--wb-ai-wash)",
    tagline: "Generates verification test cases from accepted requirements — method, steps and pass/fail criteria, traced back to each requirement.",
    skills: ["Verification", "Method selection", "Coverage"],
  },
  {
    key: "cdrl", name: "CDRL Drafter", badge: "soon",
    icon: ScrollText, accent: "var(--faint)", wash: "var(--inset)",
    tagline: "Drafts contract data deliverables (CDRLs / DIDs) from program artifacts, formatted to the applicable data item description.",
    skills: ["Contract data", "DID formatting", "Compliance"],
  },
];

/* ---- shared curated-prompt strip ---- */
function PromptStrip({ meta, prompt, setPrompt, dirty, open, setOpen, review, onRerun, defaultPrompt }) {
  return (
    <>
      <div className="wb-promptbar">
        <div className="lft">
          <div className="wb-ai-badge"><Sparkles size={16} /></div>
          <div>
            <div className="t1">Curated prompt · {meta.name}{dirty ? " · edited for this run" : ""}</div>
            <div className="t2">{meta.v} · locked by admin · fine-tune before {review ? "re-running" : "running"}</div>
          </div>
        </div>
        <button className="tf-btn tf-btn-ghost" style={{ padding: "7px 12px", fontSize: 12.5, color: "var(--wb-ai-2)", borderColor: "var(--wb-ai-line)", background: "var(--wb-ai-wash)" }} onClick={() => setOpen(!open)}>
          <Pencil size={14} /> {open ? "Hide prompt" : "View / edit prompt"}
        </button>
      </div>
      {open && (
        <div className="wb-prompt-editor">
          <div className="wb-pe-head">
            <div className="t"><Sparkles size={14} /> Curated prompt — editable for this run only</div>
            <span className="wb-varchip">reverts to {meta.v} after run</span>
          </div>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <div className="wb-pe-foot">
            <span className="note">Auto-filled: {meta.vars.map((v) => <span key={v} className="wb-varchip" style={{ marginRight: 5 }}>{v}</span>)}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="tf-btn tf-btn-ghost" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={() => setPrompt(defaultPrompt)}>Reset to {meta.v}</button>
              {review && <button className="tf-btn tf-btn-primary" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={onRerun}><Sparkles size={13} /> Re-run</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stepper({ steps, step, setStep, can }) {
  return (
    <div className="wb-stepper">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <span className="wb-step-arrow"><ChevronRight size={16} /></span>}
          <div className={`wb-step ${i === step ? "on" : i < step ? "done" : ""} ${can[i] ? "clickable" : ""}`}
            onClick={() => can[i] && setStep(i)}>
            <span className="n">{i < step ? <Check size={13} /> : i + 1}</span>{s}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function RunOverlay({ h, p }) {
  return <div className="wb-panel"><div className="wb-run"><div className="big" /><h4>{h}</h4><p>{p}</p></div></div>;
}

function TriageToolbar({ tally, filter, setFilter, onAcceptAll }) {
  return (
    <div className="wb-triage">
      <span className="wb-chip pend"><span className="dot" />{tally.pend} pending</span>
      <span className="wb-chip ok"><span className="dot" />{tally.ok} accepted</span>
      <span className="wb-chip no"><span className="dot" />{tally.no} rejected</span>
      <div style={{ flex: 1 }} />
      <button className="tf-btn tf-btn-ghost" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={onAcceptAll}><Check size={14} /> Accept all pending</button>
      <div className="wb-filters">
        {["all", "pend", "ok", "no"].map((f) => (
          <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
            {{ all: "All", pend: "Pending", ok: "Accepted", no: "Rejected" }[f]}
          </button>
        ))}
      </div>
    </div>
  );
}

const StatusLabel = ({ st }) =>
  st === "ok" ? <span className="stl"><Check size={13} /> Accepted</span>
    : st === "no" ? <span className="stl"><X size={13} /> Rejected</span>
      : <span className="stl">● Pending review</span>;

function TriageActions({ st, id, onAct }) {
  return (
    <div className="wb-actions">
      <button className={`wb-act a-no ${st === "no" ? "on-no" : ""}`} title="Reject" onClick={() => onAct(id, "no")}><X size={16} /></button>
      <button className="wb-act a-edit" title="Edit" onClick={() => onAct(id, "edit")}><Pencil size={15} /></button>
      <button className={`wb-act a-ok ${st === "ok" ? "on-ok" : ""}`} title="Accept" onClick={() => onAct(id, "ok")}><Check size={16} /></button>
    </div>
  );
}

/* =========================================================================
   OFFLINE ENGINES — genuine heuristics that run on the real source text.
   ========================================================================= */
const Extractor = {
  MODALS: [
    { re: /\bshall\b/i, binding: true }, { re: /\bmust\b/i, binding: true },
    { re: /\bis required to\b/i, binding: true }, { re: /\bshall be capable of\b/i, binding: true },
    { re: /\bwill\b/i, binding: false }, { re: /\bshould\b/i, binding: false }, { re: /\bmay\b/i, binding: false },
  ],
  classify(s) {
    const t = s.toLowerCase();
    if (/(interface|data bus|1553|protocol|message|icd|ethernet|discrete|connector|api)\b/.test(t)) return "Interface";
    if (/(within|less than|no (?:greater|more) than|milliseconds?|\bms\b|seconds?|\bhz\b|throughput|latency|rate of|accuracy|resolution|\d+\s?%)/.test(t)) return "Performance";
    if (/(temperature|humidity|vibration|altitude|shock|°c|degrees|thermal|environment|ingress|salt fog)/.test(t)) return "Environmental";
    if (/(safety|hazard|fail[- ]?safe|emergency|interlock|hazardous|redundan)/.test(t)) return "Safety";
    if (/(shall (?:not )?(?:be|use|weigh|comply|conform)|weight|mass|dimensions|material|standard|mil-std|conform)/.test(t)) return "Design Constraint";
    return "Functional";
  },
  splitSentences(block) {
    return block.replace(/\s+/g, " ").split(/(?<=[.;])\s+(?=[A-Z(0-9])/).map((s) => s.trim()).filter(Boolean);
  },
  run(text, sources) {
    const primary = (sources && sources[0] && sources[0].name) || "pasted-text";
    const lines = text.split(/\r?\n/);
    let section = "", out = [], seen = new Set(), n = 0;
    const secRe = /^\s*(\d+(?:\.\d+)*)(?:\s+|\)\s*)([A-Z][^\n]{2,60})?/;
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li].trim();
      if (!line) continue;
      const sm = line.match(secRe);
      if (sm && line.length < 80 && !/\b(shall|must|will|should|may)\b/i.test(line)) { section = sm[1]; continue; }
      for (const sent of this.splitSentences(line)) {
        if (sent.length < 15) continue;
        const modal = this.MODALS.find((m) => m.re.test(sent));
        if (!modal) continue;
        const key = sent.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
        if (seen.has(key)) continue; seen.add(key);
        n++;
        const figMatch = sent.match(/\b(Figure|Table|Fig\.?)\s+([0-9][0-9.\-]*)/i);
        const clean = sent.replace(/\s+/g, " ").trim().replace(/[.;]+$/, "") + ".";
        out.push({
          id: "REQ-C-" + String(n).padStart(3, "0"),
          type: this.classify(sent), plain: clean, src: primary,
          loc: section ? "§" + section + " · line " + (li + 1) : "line " + (li + 1),
          section: section || "—", nonbinding: !modal.binding,
          figure: figMatch ? figMatch[1].replace("Fig.", "Figure") + " " + figMatch[2] : null,
        });
      }
    }
    return out;
  },
};

const Deriver = {
  num(re, text) { const m = text.match(re); return m ? parseFloat(m[1]) : null; },
  run(parents, ctx) {
    const rcs = parseFloat(ctx.rcs) || 1;
    const lru = Math.max(1, parseInt(ctx.lru) || 6);
    const mttr = parseFloat(ctx.mttr) || 2;
    const reserve = Math.min(80, parseFloat(ctx.reserve) || 20);
    const stds = (ctx.standards || "").trim();
    const out = [];
    parents.forEach((p) => {
      const t = p.text, low = t.toLowerCase(); let k = 0;
      const base = p.id.replace(/[^0-9]/g, "") || p.id;
      const add = (text, type, rationale) => { k++; out.push({ id: "DER-" + base + "." + k, parent: p.id, parentText: p.text, type, plain: text, rationale }); };
      const km = this.num(/(\d+(?:\.\d+)?)\s*km/i, t);
      if (km && /detect|range|track/.test(low)) {
        const gain = Math.round(30 + (km - 100) / 20);
        add(`The antenna assembly shall provide a minimum gain of ${gain} dBi to achieve the ${km} km detection range against a ${rcs} m² RCS target.`, "Performance", `Range budget: closing the radar range equation at ${km} km for a ${rcs} m² target requires ≥ ${gain} dBi given assumed transmit power and receiver sensitivity.`);
        add(`The receiver shall achieve a noise figure no greater than 3.5 dB.`, "Performance", `Sensitivity apportionment needed to detect the ${rcs} m² target at ${km} km with adequate SNR margin.`);
      }
      const av = this.num(/(\d+(?:\.\d+)?)\s*%/i, t);
      if (av && /availab/.test(low)) {
        const a = av / 100, mtbfSys = Math.round(a * mttr / (1 - a)), perLru = Math.round(mtbfSys * lru / 100) * 100;
        add(`Each line-replaceable unit shall exhibit an MTBF of no less than ${perLru.toLocaleString()} hours.`, "Reliability", `Availability ${av}% with assumed MTTR ${mttr} h ⇒ system MTBF ≈ ${mtbfSys.toLocaleString()} h; apportioned equally across ${lru} series LRUs ⇒ ≥ ${perLru.toLocaleString()} h per LRU.`);
        add(`The mean corrective maintenance time (MTTR) shall not exceed ${mttr} hours at the LRU level.`, "Maintainability", `MTTR bound is the maintainability assumption underpinning the ${av}% availability target.`);
      }
      let ms = this.num(/within\s*(\d+(?:\.\d+)?)\s*ms/i, t);
      if (ms === null) { const s = this.num(/within\s*(\d+(?:\.\d+)?)\s*(?:seconds?|s)\b/i, t); if (s !== null) ms = s * 1000; }
      if (ms) {
        const usable = Math.round(ms * (1 - reserve / 100)), proc = Math.round(usable * 0.6), io = usable - proc;
        add(`The processing chain shall complete its allocated function within ${proc.toLocaleString()} ms.`, "Performance", `Timing budget: ${ms.toLocaleString()} ms parent, holding ${reserve}% reserve ⇒ ${usable.toLocaleString()} ms usable, apportioned 60/40 processing/transport.`);
        add(`End-to-end interface transport latency shall not exceed ${io.toLocaleString()} ms.`, "Interface", `Remaining 40% of the ${usable.toLocaleString()} ms usable budget allocated to transport after ${reserve}% reserve.`);
      }
      if (/built-in test|\bbit\b|fault isolation/.test(low)) {
        add(`Built-in test shall detect no less than 95% of all detectable failure modes.`, "Design Constraint", `BIT coverage floor required to support the parent fault-detection intent; 95% is the standard detection threshold pending FMECA confirmation.`);
        add(`Built-in test shall isolate a detected fault to an ambiguity group of no more than 3 LRUs.`, "Maintainability", `Isolation ambiguity bound derived from the parent LRU-level fault isolation requirement.`);
      }
      const tm = t.match(/(-?\d+)\s*(?:°|deg(?:rees)?)?\s*C\b[^0-9]{0,12}(\+?\-?\d+)\s*(?:°|deg(?:rees)?)?\s*C/i);
      if (tm) {
        const lo = parseInt(tm[1]) - 5, hi = parseInt(tm[2].replace("+", "")) + 5;
        add(`Each component and LRU shall be qualified across an ambient range of ${lo} °C to +${hi} °C.`, "Environmental", `Component qualification range carries a 5 °C margin beyond the system operating range${stds ? ", per " + stds.split(",")[0].trim() : ""}.`);
      }
      if (/interface|tasking|c2|message|\bbus\b|icd/.test(low) && !km) {
        add(`Messages exchanged over the interface shall conform to the applicable ICD message format.`, "Interface", `Format conformance is the minimum derived obligation for any parent that mandates an external interface.`);
        add(`The subsystem shall reject malformed messages without loss of function.`, "Interface", `Robustness requirement derived to protect parent interface behavior against invalid input.`);
      }
      if (k === 0) {
        add(`A verification method (Test, Analysis, Inspection, or Demonstration) shall be defined and executed to confirm satisfaction of ${p.id}.`, "Verification", `No quantitative decomposition pattern matched; a verification obligation is derived to keep the parent testable and traceable.`);
      }
    });
    return out;
  },
};

/* ----------------------------- sample data ------------------------------ */
const SAMPLE_SPEC = `SOFTWARE / SYSTEM REQUIREMENTS SPECIFICATION — RADAR SUBSYSTEM (Rev C)

3 SYSTEM REQUIREMENTS

3.2.1 Track Acquisition
The system shall acquire target track data at a minimum rate of 10 Hz across the full operational field of regard. The subsystem should provide a consolidated track picture to the operator display.

3.2.4 Threat Classification
The processor shall complete threat classification within 250 ms of track establishment under nominal processing load. Classification confidence will be reported to the operator.

3.3 Interfaces
The subsystem shall transmit track messages over the MIL-STD-1553B data bus per ICD-4471, as shown in Figure 2-1. The system must reject malformed messages without loss of track continuity.

3.4 Environmental
The equipment shall operate within specification across an ambient temperature range of -40 C to +71 C. The enclosure shall conform to IP65 ingress protection.

3.5 Safety
The system shall provide a fail-safe transmit inhibit that is required to disable radiation within 50 ms of an emergency stop command.

3.6 Design Constraints
The line-replaceable unit shall not exceed 12 kg in mass. The subsystem shall comply with MIL-STD-461 for electromagnetic compatibility.`;

const SAMPLE_PARENTS = [
  { id: "SYS-104", text: "The system shall detect airborne targets within a 200 km range.", meta: "L1 · Verified" },
  { id: "SYS-118", text: "The system shall maintain 99.5% operational availability over any 30-day period.", meta: "L1 · Approved" },
  { id: "SYS-131", text: "The system shall provide continuous built-in test with fault isolation to the LRU level.", meta: "L1 · Approved" },
  { id: "SYS-142", text: "The system shall accept mission tasking via the external C2 interface within 5 seconds.", meta: "L1 · In review" },
  { id: "SYS-155", text: "The system shall operate across an ambient temperature range of -40 C to +55 C.", meta: "L1 · Approved" },
];

const EXTRACT_PROMPT = `ROLE: You are a systems engineering requirements analyst.

TASK: Review the source document(s) and identify every candidate requirement. A candidate is any statement that imposes a binding condition, capability, constraint, or interface on the system.

RULES:
- Normalize each candidate to a single "shall" statement.
- Classify as: Functional | Performance | Interface | Environmental | Safety | Design Constraint.
- Flag non-binding language ("should", "will", "may") for engineer confirmation.
- Capture ORIGIN for every candidate: {document}, {section}, {page/line}.
- If a Figure or Table is referenced near the requirement, attach it.
- Do NOT invent requirements not grounded in the source text.`;

const DERIVE_PROMPT = `ROLE: You are a systems engineer performing requirements decomposition.

TASK: For each selected PARENT requirement, propose the child (derived) requirements necessary and sufficient to satisfy it.

RULES:
- Every derived requirement MUST trace to exactly one parent {parent_id}.
- Provide a one-sentence RATIONALE grounded in engineering analysis (budgets, apportionment, standards).
- If essential context is missing (RCS, LRU count, MTTR, timing reserve), REQUEST it before deriving.
- Use apportionment where a parent budget must be split across subsystems.
- Maintain "shall" phrasing and testability.`;

/* =========================================================================
   AGENT 1 — REQUIREMENTS EXTRACTOR
   ========================================================================= */
function ExtractorAgent({ toast }) {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [pasted, setPasted] = useState("");
  const [prompt, setPrompt] = useState(EXTRACT_PROMPT);
  const [promptOpen, setPromptOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [edits, setEdits] = useState({});
  const [filter, setFilter] = useState("all");
  const [running, setRunning] = useState(false);
  const [drag, setDrag] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  const inputRef = useRef();
  const meta = { name: "Requirements Extractor", v: "v3.2", vars: ["{document}", "{section}", "{page/line}", "{project_context}"] };

  const promptDirty = prompt !== EXTRACT_PROMPT;
  const sourceText = useMemo(() => {
    const ft = files.filter((f) => f.status === "ok").map((f) => f.text).join("\n\n");
    return [ft, pasted].filter((t) => t && t.trim()).join("\n\n");
  }, [files, pasted]);
  const hasSource = sourceText.trim().length > 20;

  const tally = useMemo(() => {
    const ok = candidates.filter((c) => statuses[c.id] === "ok").length;
    const no = candidates.filter((c) => statuses[c.id] === "no").length;
    return { ok, no, pend: candidates.length - ok - no };
  }, [candidates, statuses]);
  const accepted = candidates.filter((c) => statuses[c.id] === "ok");
  const visible = candidates.filter((c) => { const st = statuses[c.id] || "pend"; return filter === "all" || filter === st; });
  const exportText = (c) => (edits[c.id] != null ? edits[c.id] : c.plain);

  async function addFiles(list) {
    for (const file of list) {
      const ext = fileExt(file.name);
      const uid = "f" + Math.random().toString(36).slice(2, 8);
      const rec = { uid, name: file.name, ext: (ext || "txt").toUpperCase().slice(0, 4), sizeLabel: sizeLabel(file.size), status: "busy", text: "", pages: "" };
      setFiles((fs) => [...fs, rec]);
      const patch = (u) => setFiles((fs) => fs.map((f) => (f.uid === uid ? { ...f, ...u } : f)));
      try {
        if (["txt", "md", "csv", "text"].includes(ext) || !ext) patch({ text: await file.text(), status: "ok" });
        else if (ext === "docx") {
          await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
          const res = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
          patch({ text: res.value, status: res.value.trim() ? "ok" : "err", error: "No text found" });
        } else if (ext === "pdf") {
          await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
          let txt = "";
          for (let p = 1; p <= pdf.numPages; p++) { const pg = await pdf.getPage(p); const tc = await pg.getTextContent(); txt += tc.items.map((i) => i.str).join(" ") + "\n"; }
          patch({ text: txt, pages: pdf.numPages + " pp", status: txt.trim() ? "ok" : "err", error: "No text found" });
        } else patch({ status: "err", error: "Unsupported type" });
      } catch (e) {
        patch({ status: "err", error: /load failed/.test(e.message) ? "Parser CDN blocked — paste text instead" : (e.message || "Parse failed") });
      }
    }
  }

  async function runExtract() {
    setRunning(true);
    await wait(900);
    const out = Extractor.run(sourceText, files.filter((f) => f.status === "ok"));
    setCandidates(out); setStatuses({}); setEdits({}); setFilter("all"); setStep(1); setRunning(false);
    toast(`Extracted ${out.length} candidate requirement(s)`);
  }

  function act(id, a) {
    if (a === "edit") { setEditing(id); setEditVal(edits[id] != null ? edits[id] : candidates.find((c) => c.id === id).plain); return; }
    setStatuses((s) => ({ ...s, [id]: s[id] === a ? "pend" : a }));
  }
  function saveEdit() { setEdits((e) => ({ ...e, [editing]: editVal.trim() })); setStatuses((s) => ({ ...s, [editing]: "ok" })); setEditing(null); toast("Edit saved & accepted"); }

  function buildRows() {
    return accepted.map((c) => ({ ID: c.id, Type: c.type, Requirement: exportText(c), Source: c.src, Location: c.loc, Section: c.section, NonBinding: c.nonbinding ? "YES" : "", Figure: c.figure || "", Edited: edits[c.id] != null ? "YES" : "" }));
  }
  function doExport(kind) {
    const rows = buildRows(); if (!rows.length) return;
    if (kind === "csv" || kind === "xlsx") {
      const cols = Object.keys(rows[0]);
      const csv = [cols.join(","), ...rows.map((r) => cols.map((k) => csvCell(r[k])).join(","))].join("\n");
      download("requirements_extracted.csv", csv, "text/csv"); toast(`Exported ${rows.length} to ${kind.toUpperCase()}`);
    } else if (kind === "json") {
      download("requirements_extracted.json", JSON.stringify(rows, null, 2), "application/json"); toast(`Exported ${rows.length} to JSON`);
    } else if (kind === "reqif" || kind === "jama") {
      toast(`${kind === "reqif" ? "ReqIF package" : "Jama push"} — integration seam · stubbed in this build`);
    }
  }

  const steps = ["Upload sources", "Review candidates", "Export"];
  const can = [true, candidates.length > 0, candidates.length > 0];

  return (
    <>
      <Stepper steps={steps} step={step} setStep={setStep} can={can} />

      {step === 0 && (running ? <RunOverlay h="Reading sources & extracting requirements" p="Running the curated Extractor prompt over your source text." /> : (
        <>
          <div className="wb-panel">
            <div className="wb-panel-head"><h3>Source documents</h3><span className="cnt">{files.length} file(s)</span></div>
            <div className="wb-panel-pad">
              <div className={`wb-drop ${drag ? "drag" : ""}`} onClick={() => inputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}>
                <div className="dic"><Upload size={22} /></div>
                <h4>Drop specification documents here</h4>
                <p>Or click to browse. Upload one document or an entire set — ThreadWire reads across all of them.</p>
                <div className="fmt">.txt · .md · .csv parse instantly · .docx · .pdf parse in-browser</div>
              </div>
              <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.txt,.md,.csv,.text" style={{ display: "none" }}
                onChange={(e) => { if (e.target.files.length) addFiles(e.target.files); e.target.value = ""; }} />
              {files.length > 0 && (
                <div className="wb-filelist">
                  {files.map((f) => (
                    <div key={f.uid} className="wb-file">
                      <div className="fi">{f.ext}</div>
                      <div className="meta"><div className="fn">{f.name}</div><div className="fs">{f.sizeLabel}{f.pages ? " · " + f.pages : ""}</div></div>
                      <span className={`st ${f.status}`}>{f.status === "ok" ? <><Check size={13} /> Parsed</> : f.status === "busy" ? <><span className="wb-spin" /> Parsing</> : <><X size={13} /> {f.error || "Failed"}</>}</span>
                      <button className="rm" onClick={() => setFiles((fs) => fs.filter((x) => x.uid !== f.uid))}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="wb-orline">or paste text</div>
              <textarea className="wb-paste" value={pasted} onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste requirement text, a spec section, or an email thread…" />
              <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
                <button className="tf-btn tf-btn-ghost" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={() => setPasted(SAMPLE_SPEC)}>Load sample specification</button>
                <span className="wb-mono" style={{ color: "var(--faint)", fontSize: 11 }}>{sourceText.length.toLocaleString()} characters ready</span>
              </div>
            </div>
          </div>
          <PromptStrip meta={meta} prompt={prompt} setPrompt={setPrompt} dirty={promptDirty} open={promptOpen} setOpen={setPromptOpen} defaultPrompt={EXTRACT_PROMPT} />
          <div className="wb-actionbar">
            <div className="sum">{hasSource ? <><b>Source ready.</b> Run extraction to surface candidate requirements.</> : "Add at least one source to begin."}</div>
            <div style={{ flex: 1 }} />
            <button className="tf-btn tf-btn-primary" disabled={!hasSource} onClick={runExtract}><Sparkles size={15} /> Extract requirements <ArrowRight size={15} /></button>
          </div>
        </>
      ))}

      {step === 1 && (running ? <RunOverlay h="Re-running extraction" p="Applying your prompt changes to the source text." /> : (
        <>
          <PromptStrip meta={meta} prompt={prompt} setPrompt={setPrompt} dirty={promptDirty} open={promptOpen} setOpen={setPromptOpen} review defaultPrompt={EXTRACT_PROMPT} onRerun={runExtract} />
          <TriageToolbar tally={tally} filter={filter} setFilter={setFilter} onAcceptAll={() => setStatuses((s) => { const n = { ...s }; candidates.forEach((c) => { if (!(n[c.id] === "ok" || n[c.id] === "no")) n[c.id] = "ok"; }); return n; })} />
          {visible.length ? visible.map((c) => {
            const st = statuses[c.id] || "pend"; const edited = edits[c.id] != null;
            return (
              <div key={c.id} className={`wb-card ${st === "ok" ? "ok" : st === "no" ? "no" : ""}`}>
                <div className="rail" />
                <div className="cbody">
                  <div className="top">
                    <span className="rid">{c.id}</span>
                    <span className="wb-mini type">{c.type}</span>
                    {st === "pend" && <span className="wb-mini status">Candidate</span>}
                    {c.nonbinding && <span className="wb-mini flag">Non-binding · confirm</span>}
                    {edited && <span className="wb-mini edited">Edited</span>}
                    <StatusLabel st={st} />
                  </div>
                  {editing === c.id ? (
                    <>
                      <textarea className="edit" value={editVal} onChange={(e) => setEditVal(e.target.value)} autoFocus />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button className="tf-btn tf-btn-primary" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={saveEdit}>Save & accept</button>
                        <button className="tf-btn tf-btn-ghost" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <div className="reqtext">{edited ? edits[c.id] : renderHighlighted(c.plain)}</div>
                  )}
                  {c.figure && (
                    <div className="wb-reqimg">
                      <div className="thumb"><svg viewBox="0 0 200 130" preserveAspectRatio="none" width="88" height="57"><rect width="200" height="130" fill="#EEF2F5" /><path d="M0 100 L55 55 L95 92 L135 48 L200 108 V130 H0 Z" fill="#C6D0D8" /><circle cx="150" cy="35" r="14" fill="#E7CF97" /><path d="M0 115 L45 80 L80 108 L120 72 L200 118 V130 H0 Z" fill="#A9B7C0" /></svg></div>
                      <div className="cap">Referenced figure: <b>{c.figure}</b><span className="wb-mono">image capture runs server-side on the source PDF · linked to {c.id}</span></div>
                    </div>
                  )}
                  <div className="wb-origin">
                    <div className="s"><FileText size={14} /> Origin: <span className="wb-mono">{c.src}</span> · {c.loc}</div>
                    <div className="spacer" />
                    <TriageActions st={st} id={c.id} onAct={act} />
                  </div>
                </div>
              </div>
            );
          }) : <div className="wb-empty"><Inbox size={40} /><div>No candidates match this filter.</div></div>}
          <div className="wb-actionbar">
            <div className="sum"><b>{tally.ok} of {candidates.length}</b> accepted · export what you approve</div>
            <div style={{ flex: 1 }} />
            <button className="tf-btn tf-btn-ghost" onClick={() => setStep(0)}>Back to sources</button>
            <button className="tf-btn tf-btn-primary" disabled={!accepted.length} onClick={() => setStep(2)}>Export accepted set <ArrowRight size={15} /></button>
          </div>
        </>
      ))}

      {step === 2 && (
        <>
          <div className="wb-exp-summary">
            <div><span className="k">Accepted</span><span className="v">{accepted.length}</span></div>
            <div><span className="k">Edited</span><span className="v">{accepted.filter((c) => edits[c.id] != null).length}</span></div>
            <div><span className="k">Rejected</span><span className="v">{tally.no}</span></div>
            <div><span className="k">Source</span><span className="v wb-mono" style={{ fontSize: 13 }}>{(files[0] && files[0].name) || "pasted-text"}</span></div>
          </div>
          <div className="wb-panel">
            <div className="wb-panel-head"><h3>Export accepted requirements</h3><span className="cnt">{accepted.length} item(s)</span></div>
            <div className="wb-panel-pad">
              {accepted.length ? [
                ["csv", "CSV", "CSV", "Comma-separated file with full traceability columns"],
                ["xlsx", "XLSX", "Excel workbook", "Structured export (falls back to CSV if unavailable)"],
                ["reqif", "REQIF", "IBM DOORS (ReqIF)", "Standards-based ReqIF package for module import"],
                ["jama", "JAMA", "Jama Connect", "Push as a new set, authored under your credentials"],
                ["json", "JSON", "JSON", "Machine-readable export for pipelines"],
              ].map((o) => (
                <div key={o[0]} className="wb-export-opt" onClick={() => doExport(o[0])}>
                  <div className="ei">{o[1]}</div>
                  <div><div className="n">{o[2]}</div><div className="d">{o[3]}</div></div>
                  <div className="go"><ChevronRight size={16} /></div>
                </div>
              )) : <div className="wb-empty"><Inbox size={40} /><div>Nothing accepted yet. Go back and approve some candidates.</div></div>}
            </div>
          </div>
          <div className="wb-actionbar">
            <div className="sum"><b>{accepted.length}</b> accepted requirement(s) ready to export</div>
            <div style={{ flex: 1 }} />
            <button className="tf-btn tf-btn-ghost" onClick={() => setStep(1)}>Back to review</button>
          </div>
        </>
      )}
    </>
  );
}

/* =========================================================================
   AGENT 2 — DERIVATION ASSISTANT
   ========================================================================= */
function ctxQuestionsFor(parents) {
  const all = parents.map((p) => p.text.toLowerCase()).join(" ");
  const qs = [];
  if (/detect|range|track|\dkm|\d\s*km/.test(all)) qs.push({ key: "rcs", label: "Target RCS assumption (m²)", why: "needed for the range budget", def: "1", trig: "triggered by a detection-range requirement" });
  if (/availab/.test(all)) {
    qs.push({ key: "lru", label: "Number of series LRUs for apportionment", why: "needed to split the availability budget", def: "6", trig: "triggered by an availability requirement" });
    qs.push({ key: "mttr", label: "Assumed MTTR at LRU level (hours)", why: "needed to solve for MTBF", def: "2", trig: "triggered by an availability requirement" });
  }
  if (/within\s*\d/.test(all)) qs.push({ key: "reserve", label: "Timing reserve margin to hold (%)", why: "held back before apportioning", def: "20", trig: "triggered by a timing requirement" });
  qs.push({ key: "standards", label: "Applicable standards to invoke (optional)", why: "cited in derived rationale", def: "MIL-STD-810, MIL-STD-461", trig: "always asked" });
  return qs;
}

function DerivationAgent({ toast }) {
  const [step, setStep] = useState(0);
  const [src, setSrc] = useState("feed");
  const [parents, setParents] = useState(SAMPLE_PARENTS);
  const [selected, setSelected] = useState(() => Object.fromEntries(SAMPLE_PARENTS.map((p) => [p.id, true])));
  const [feedLoaded, setFeedLoaded] = useState(false);
  const [pasteRaw, setPasteRaw] = useState("");
  const [prompt, setPrompt] = useState(DERIVE_PROMPT);
  const [promptOpen, setPromptOpen] = useState(false);
  const [awaitingContext, setAwaitingContext] = useState(false);
  const [contextQs, setContextQs] = useState([]);
  const [context, setContext] = useState({});
  const [derived, setDerived] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [edits, setEdits] = useState({});
  const [filter, setFilter] = useState("all");
  const [running, setRunning] = useState(false);
  const [drag, setDrag] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [parentView, setParentView] = useState(null);
  const inputRef = useRef();
  const meta = { name: "Derivation Assistant", v: "v2.1", vars: ["{parent_id}", "{parent_text}", "{project_context}", "{applicable_standards}"] };

  const promptDirty = prompt !== DERIVE_PROMPT;
  const selectedParents = parents.filter((p) => selected[p.id]);
  const tally = useMemo(() => {
    const ok = derived.filter((d) => statuses[d.id] === "ok").length;
    const no = derived.filter((d) => statuses[d.id] === "no").length;
    return { ok, no, pend: derived.length - ok - no };
  }, [derived, statuses]);
  const accepted = derived.filter((d) => statuses[d.id] === "ok");
  const visible = derived.filter((d) => { const st = statuses[d.id] || "pend"; return filter === "all" || filter === st; });
  const exportText = (d) => (edits[d.id] != null ? edits[d.id] : d.plain);

  function setSel(id) { setSelected((s) => ({ ...s, [id]: !s[id] })); }
  function loadSample() { setParents(SAMPLE_PARENTS); setSelected(Object.fromEntries(SAMPLE_PARENTS.map((p) => [p.id, true]))); }
  function loadFeed() {
    toast("Pulling from Jama…");
    setTimeout(() => { setParents(SAMPLE_PARENTS); setSelected(Object.fromEntries(SAMPLE_PARENTS.map((p) => [p.id, true]))); setFeedLoaded(true); }, 700);
  }
  function parsePasted(raw) {
    const rows = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const ps = rows.map((l, i) => {
      const m = l.match(/^([A-Za-z][\w.\-]{1,20})[\s:\-–]+(.*\bshall\b.*|.+)$/);
      if (m && /shall|must|will|should/i.test(m[2])) return { id: m[1].toUpperCase(), text: m[2].trim(), meta: "imported" };
      return { id: "REQ-" + String(i + 1).padStart(3, "0"), text: l, meta: "imported" };
    });
    setParents(ps); setSelected(Object.fromEntries(ps.map((p) => [p.id, true])));
  }
  async function importFile(file) {
    const ext = fileExt(file.name);
    try {
      let rows;
      if (ext === "csv" || ext === "txt") rows = (await file.text()).split(/\r?\n/).map((r) => r.split(","));
      else if (ext === "xlsx" || ext === "xls") {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
        const wb = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
        rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      } else throw new Error("Unsupported");
      parseTabular(rows); toast("Imported requirement(s)");
    } catch (e) { toast(/load failed/.test(e.message) ? "Spreadsheet engine blocked — paste instead" : "Import failed: " + e.message); }
  }
  function parseTabular(rows) {
    rows = rows.filter((r) => r && r.some((c) => String(c || "").trim()));
    if (!rows.length) return;
    const head = rows[0].map((c) => String(c || "").toLowerCase());
    let idi = head.findIndex((h) => /^id$|identifier|key|req/.test(h));
    let txi = head.findIndex((h) => /text|requirement|description|name/.test(h));
    let start = 1; if (idi < 0 && txi < 0) { idi = 0; txi = 1; start = 0; }
    if (txi < 0) txi = idi < 0 ? 0 : idi === 0 ? 1 : 0;
    const ps = [];
    for (let i = start; i < rows.length; i++) {
      const r = rows[i], text = String(r[txi] || "").trim(); if (!text) continue;
      const id = String(r[idi] != null ? r[idi] : "") || "REQ-" + String(i).padStart(3, "0");
      ps.push({ id: id.toUpperCase ? id.toUpperCase() : id, text, meta: "imported" });
    }
    setParents(ps); setSelected(Object.fromEntries(ps.map((p) => [p.id, true])));
  }

  function startDerive() {
    if (!selectedParents.length) return;
    const qs = ctxQuestionsFor(selectedParents);
    setContextQs(qs);
    setContext((c) => { const n = { ...c }; qs.forEach((q) => { if (n[q.key] == null) n[q.key] = q.def; }); return n; });
    setAwaitingContext(true);
  }
  async function runDerivation() {
    if (!selectedParents.length) return;
    setAwaitingContext(false); setRunning(true);
    await wait(1000);
    const out = Deriver.run(selectedParents, context);
    setDerived(out); setStatuses({}); setEdits({}); setFilter("all"); setStep(1); setRunning(false);
    toast(`Derived ${out.length} requirement(s) from ${selectedParents.length} parent(s)`);
  }
  function act(id, a) {
    if (a === "edit") { setEditing(id); setEditVal(edits[id] != null ? edits[id] : derived.find((d) => d.id === id).plain); return; }
    setStatuses((s) => ({ ...s, [id]: s[id] === a ? "pend" : a }));
  }
  function saveEdit() { setEdits((e) => ({ ...e, [editing]: editVal.trim() })); setStatuses((s) => ({ ...s, [editing]: "ok" })); setEditing(null); toast("Edit saved & accepted"); }

  function buildRows() { return accepted.map((d) => ({ ID: d.id, Parent: d.parent, Type: d.type, DerivedRequirement: exportText(d), Rationale: d.rationale, Edited: edits[d.id] != null ? "YES" : "" })); }
  function doExport(kind) {
    const rows = buildRows(); if (!rows.length) return;
    if (kind === "csv" || kind === "xlsx") {
      const cols = Object.keys(rows[0]);
      const csv = [cols.join(","), ...rows.map((r) => cols.map((k) => csvCell(r[k])).join(","))].join("\n");
      download("derived_requirements.csv", csv, "text/csv"); toast(`Exported ${rows.length} to ${kind.toUpperCase()}`);
    } else if (kind === "json") {
      download("derived_requirements.json", JSON.stringify(rows, null, 2), "application/json"); toast(`Exported ${rows.length} to JSON`);
    } else if (kind === "word") {
      const byP = {}; accepted.forEach((d) => { (byP[d.parent] = byP[d.parent] || []).push(d); });
      let body = "";
      Object.keys(byP).forEach((pid) => {
        const p = parents.find((x) => x.id === pid) || { text: "" };
        body += `<h2 style="font-family:Arial;font-size:13pt;color:#1B2E8C">Parent ${pid}</h2><p style="font-family:Arial;font-size:10pt;color:#333"><i>${p.text}</i></p><table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-family:Arial;font-size:10pt;width:100%"><tr style="background:#EEF2F5"><th align="left">ID</th><th align="left">Type</th><th align="left">Derived requirement</th><th align="left">Rationale</th></tr>${byP[pid].map((d) => `<tr><td>${d.id}</td><td>${d.type}</td><td>${exportText(d)}</td><td>${d.rationale}</td></tr>`).join("")}</table><br>`;
      });
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Arial"><h1 style="font-size:16pt">Derived Requirements Report</h1><p style="font-size:9pt;color:#666">ThreadWire · Derivation Assistant · ${accepted.length} requirements · ${new Date().toLocaleDateString()}</p>${body}</body></html>`;
      download("derived_requirements.doc", html, "application/msword"); toast(`Exported ${accepted.length} to Word`);
    } else if (kind === "rm") {
      toast("Import to requirements tool — integration seam · stubbed in this build");
    }
  }

  const steps = ["Source & select", "Review derived", "Export"];
  const can = [true, derived.length > 0, derived.length > 0];

  return (
    <>
      <Stepper steps={steps} step={step} setStep={setStep} can={can} />

      {step === 0 && (running ? <RunOverlay h="Deriving child requirements" p="Applying decomposition rules with your context to each selected parent." /> : (
        <>
          <div className="wb-srctabs">
            {[["feed", "API feed", "Live pull from Jama / DOORS"], ["upload", "Upload file", "Excel, CSV, or text"], ["paste", "Paste", "One requirement per line"]].map((t) => (
              <button key={t[0]} className={`wb-srctab ${src === t[0] ? "on" : ""}`} onClick={() => setSrc(t[0])}>
                <div className="si">{t[0] === "feed" ? <Zap size={17} /> : t[0] === "upload" ? <Upload size={17} /> : <Layers size={17} />}</div>
                <h4>{t[1]}</h4><p>{t[2]}</p>
              </button>
            ))}
          </div>

          {src === "feed" && (
            <div className="wb-panel"><div className="wb-panel-pad wb-feed">
              <div className="fb">{feedLoaded ? <Check size={18} /> : <Zap size={18} />}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{feedLoaded ? "Connected · Jama Connect" : "Connect to your requirements tool"}</div>
                <div className="wb-mono" style={{ fontSize: 11, color: "var(--faint)" }}>{feedLoaded ? "project SENTINEL · module: System Requirements · " + parents.length + " items pulled" : "authenticate to pull the System Requirements module"}</div>
              </div>
              <button className={`tf-btn ${feedLoaded ? "tf-btn-ghost" : "tf-btn-primary"}`} style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={loadFeed}>{feedLoaded ? "Refresh feed" : "Connect & pull"}</button>
              <span className="wb-stub"><Sparkles size={11} /> seam · stubbed</span>
            </div></div>
          )}
          {src === "upload" && (
            <div className="wb-panel"><div className="wb-panel-pad">
              <div className={`wb-drop ${drag ? "drag" : ""}`} onClick={() => inputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) importFile(e.dataTransfer.files[0]); }}>
                <div className="dic"><Upload size={22} /></div>
                <h4>Drop a requirements export</h4>
                <p>.csv / .xlsx with ID and Text columns — parsed in-browser.</p>
                <div className="fmt">.csv · .xlsx · .xls · .txt</div>
              </div>
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.txt" style={{ display: "none" }}
                onChange={(e) => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ""; }} />
            </div></div>
          )}
          {src === "paste" && (
            <div className="wb-panel"><div className="wb-panel-pad">
              <textarea className="wb-paste" value={pasteRaw} onChange={(e) => setPasteRaw(e.target.value)}
                placeholder={"SYS-104: The system shall detect airborne targets within a 200 km range.\nSYS-118: The system shall maintain 99.5% operational availability over any 30-day period."} />
              <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                <button className="tf-btn tf-btn-ghost" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={() => { if (pasteRaw.trim()) parsePasted(pasteRaw); }}>Load pasted requirements</button>
                <button className="tf-btn tf-btn-ghost" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={loadSample}>Load sample set</button>
              </div>
            </div></div>
          )}

          {parents.length > 0 && (
            <div className="wb-panel">
              <div className="wb-selecthead">
                <span className="lft">{parents.length} parent requirement(s)</span>
                <div style={{ flex: 1 }} />
                <button className="tf-btn tf-btn-ghost" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={() => setSelected(Object.fromEntries(parents.map((p) => [p.id, true])))}>Select all</button>
                <button className="tf-btn tf-btn-ghost" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={() => setSelected({})}>Clear</button>
              </div>
              <div className="wb-selectlist">
                {parents.map((p) => (
                  <div key={p.id} className={`wb-selrow ${selected[p.id] ? "sel" : ""}`} onClick={() => setSel(p.id)}>
                    <div className="wb-cb">{selected[p.id] && <Check size={13} />}</div>
                    <span className="rid">{p.id}</span><div className="rt">{p.text}</div><span className="rmeta">{p.meta || ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <PromptStrip meta={meta} prompt={prompt} setPrompt={setPrompt} dirty={promptDirty} open={promptOpen} setOpen={setPromptOpen} defaultPrompt={DERIVE_PROMPT} />

          {awaitingContext ? (
            <div className="wb-ctx">
              <div className="h"><div className="wb-ai-badge"><Sparkles size={16} /></div>
                <div><h3>ThreadWire needs a little context first</h3><p>These answers ground the derivations for your {selectedParents.length} selected parent(s). Sensible defaults are prefilled — adjust if needed.</p></div>
              </div>
              <div className="b">
                {contextQs.map((q) => (
                  <div key={q.key} className="wb-cq">
                    <label>{q.label}<span className="why">— {q.why}</span></label>
                    <input value={context[q.key] != null ? context[q.key] : q.def} onChange={(e) => setContext((c) => ({ ...c, [q.key]: e.target.value }))} />
                    <div className="trig"><Sparkles size={11} /> {q.trig}</div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <button className="tf-btn tf-btn-primary" onClick={runDerivation}><Sparkles size={15} /> Derive with this context <ArrowRight size={15} /></button>
                  <button className="tf-btn tf-btn-ghost" onClick={() => setAwaitingContext(false)}>Back to selection</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="wb-actionbar">
              <div className="sum">{selectedParents.length ? <>Deriving from <b>{selectedParents.length} parent requirement(s)</b></> : "Select at least one parent requirement to derive."}</div>
              <div style={{ flex: 1 }} />
              <button className="tf-btn tf-btn-primary" disabled={!selectedParents.length} onClick={startDerive}><Sparkles size={15} /> Derive requirements <ArrowRight size={15} /></button>
            </div>
          )}
        </>
      ))}

      {step === 1 && (running ? <RunOverlay h="Re-deriving" p="Applying prompt changes to your selected parents." /> : (
        <>
          <PromptStrip meta={meta} prompt={prompt} setPrompt={setPrompt} dirty={promptDirty} open={promptOpen} setOpen={setPromptOpen} review defaultPrompt={DERIVE_PROMPT} onRerun={runDerivation} />
          <TriageToolbar tally={tally} filter={filter} setFilter={setFilter} onAcceptAll={() => setStatuses((s) => { const n = { ...s }; derived.forEach((d) => { if (!(n[d.id] === "ok" || n[d.id] === "no")) n[d.id] = "ok"; }); return n; })} />
          {(() => {
            const groups = {}; visible.forEach((d) => { (groups[d.parent] = groups[d.parent] || []).push(d); });
            const pids = Object.keys(groups);
            if (!pids.length) return <div className="wb-empty"><Inbox size={40} /><div>No derived requirements match this filter.</div></div>;
            return pids.map((pid) => {
              const p = parents.find((x) => x.id === pid) || { text: "" };
              return (
                <div key={pid}>
                  <div className="wb-grouphead"><span className="pid">{pid}</span><span className="pt">{p.text}</span><span className="pc">{groups[pid].length} derived</span></div>
                  {groups[pid].map((d) => {
                    const st = statuses[d.id] || "pend"; const edited = edits[d.id] != null;
                    return (
                      <div key={d.id} className={`wb-card ${st === "ok" ? "ok" : st === "no" ? "no" : ""}`}>
                        <div className="rail" />
                        <div className="cbody">
                          <div className="top">
                            <span className="rid">{d.id}</span>
                            <span className="wb-mini type">{d.type}</span>
                            <span className="wb-mini ver">↳ from {d.parent}</span>
                            {edited && <span className="wb-mini edited">Edited</span>}
                            <StatusLabel st={st} />
                          </div>
                          {editing === d.id ? (
                            <>
                              <textarea className="edit" value={editVal} onChange={(e) => setEditVal(e.target.value)} autoFocus />
                              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                <button className="tf-btn tf-btn-primary" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={saveEdit}>Save & accept</button>
                                <button className="tf-btn tf-btn-ghost" style={{ padding: "6px 11px", fontSize: 12.5 }} onClick={() => setEditing(null)}>Cancel</button>
                              </div>
                            </>
                          ) : (
                            <div className="reqtext">{edited ? edits[d.id] : renderHighlighted(d.plain)}</div>
                          )}
                          <div className="wb-rationale"><span className="h">Rationale</span>{d.rationale}</div>
                          <div className="wb-foot">
                            <div className="trace"><Link2 size={14} /> Traces to <a onClick={() => setParentView(d.parent)}>{d.parent}</a></div>
                            <div className="spacer" />
                            <TriageActions st={st} id={d.id} onAct={act} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
          <div className="wb-actionbar">
            <div className="sum"><b>{tally.ok} of {derived.length}</b> accepted · export what you approve</div>
            <div style={{ flex: 1 }} />
            <button className="tf-btn tf-btn-ghost" onClick={() => setStep(0)}>Back to selection</button>
            <button className="tf-btn tf-btn-primary" disabled={!accepted.length} onClick={() => setStep(2)}>Export / import derived set <ArrowRight size={15} /></button>
          </div>
        </>
      ))}

      {step === 2 && (
        <>
          <div className="wb-exp-summary">
            <div><span className="k">Accepted</span><span className="v">{accepted.length}</span></div>
            <div><span className="k">From parents</span><span className="v">{new Set(accepted.map((i) => i.parent)).size}</span></div>
            <div><span className="k">Edited</span><span className="v">{accepted.filter((c) => edits[c.id] != null).length}</span></div>
            <div><span className="k">Rejected</span><span className="v">{tally.no}</span></div>
          </div>
          <div className="wb-panel">
            <div className="wb-panel-head"><h3>Export or import derived requirements</h3><span className="cnt">{accepted.length} item(s)</span></div>
            <div className="wb-panel-pad">
              {accepted.length ? [
                ["rm", "JAMA", "Import to requirements tool", "Write children under their parent, linked (authored by you)"],
                ["xlsx", "XLSX", "Excel workbook", "Structured export with parent traceability"],
                ["word", "DOCX", "Word document", "Formatted derivation report, grouped by parent"],
                ["json", "JSON", "JSON", "Machine-readable export for pipelines"],
                ["csv", "CSV", "CSV", "Flat export with all columns"],
              ].map((o) => (
                <div key={o[0]} className="wb-export-opt" onClick={() => doExport(o[0])}>
                  <div className="ei">{o[1]}</div>
                  <div><div className="n">{o[2]}</div><div className="d">{o[3]}</div></div>
                  <div className="go"><ChevronRight size={16} /></div>
                </div>
              )) : <div className="wb-empty"><Inbox size={40} /><div>Nothing accepted yet. Go back and approve some derived requirements.</div></div>}
            </div>
          </div>
          <div className="wb-actionbar">
            <div className="sum"><b>{accepted.length}</b> derived requirement(s) ready</div>
            <div style={{ flex: 1 }} />
            <button className="tf-btn tf-btn-ghost" onClick={() => setStep(1)}>Back to review</button>
          </div>
        </>
      )}

      {parentView && (() => {
        const p = parents.find((x) => x.id === parentView) || { text: "(not available)" };
        const kids = derived.filter((d) => d.parent === parentView);
        return (
          <div onClick={() => setParentView(null)} style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(17,28,37,.5)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 18 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, width: "100%", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--wb-brand-wash)", color: "var(--wb-brand)", display: "grid", placeItems: "center" }}><Link2 size={16} /></div>
                <div><div style={{ fontFamily: "var(--disp)", fontSize: 16, fontWeight: 700 }}>{parentView} · parent</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{kids.length} derived child requirement(s)</div></div>
              </div>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ fontSize: 12.5, color: "var(--muted)", background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8, padding: 11, marginBottom: 12 }}><b style={{ color: "var(--ink)" }}>Parent text</b><br />{p.text}</div>
                {kids.map((d) => (
                  <div key={d.id} style={{ fontSize: 12.5, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                    <span className="wb-mono" style={{ color: "var(--wb-brand-ink)", fontWeight: 600 }}>{d.id}</span> — {exportText(d)}
                  </div>
                ))}
              </div>
              <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end", background: "var(--panel2)" }}>
                <button className="tf-btn tf-btn-primary" onClick={() => setParentView(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

/* =========================================================================
   TOP-LEVEL WORKBENCH — agent gallery + agent host
   ========================================================================= */
export default function AIWorkbench() {
  const [agent, setAgent] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toastT = useRef();
  const toast = (msg) => { setToastMsg(msg); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(null), 2600); };

  const active = AGENTS.find((a) => a.key === agent);

  return (
    <div className="wb" style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 22px 70px" }}>
      <WBStyles />

      {!active ? (
        <>
          <div className="tf-eyebrow" style={{ marginBottom: 12 }}>Module · AI Workbench</div>
          <div className="wb-tool-head">
            <div className="ic"><Bot size={26} /></div>
            <div>
              <h1>AI Workbench</h1>
              <p>Purpose-built AI agents for systems engineering. Each agent runs a curated, admin-owned prompt with a specific skill set over your source material — and puts you in control of every result. Accept, reject, or refine each output, then export to your requirements tools.</p>
            </div>
          </div>

          <div className="wb-gallery tf-stagger">
            {AGENTS.map((a) => {
              const Icon = a.icon; const live = a.badge === "live";
              return (
                <div key={a.key} className={`wb-agent ${live ? "" : "locked"}`} onClick={() => live && setAgent(a.key)}>
                  <div className="ai" style={{ background: a.wash, color: a.accent }}><Icon size={23} /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <h3 style={{ margin: 0 }}>{a.name}</h3>
                    <span className={`wb-badge ${a.badge}`} style={{ marginLeft: "auto" }}>{a.badge === "live" ? "Live" : a.badge === "next" ? "Next" : "Soon"}</span>
                  </div>
                  <p>{a.tagline}</p>
                  <div className="row" style={{ flexWrap: "wrap" }}>
                    {a.skills.map((s) => <span key={s} className="wb-skill">{s}</span>)}
                  </div>
                  <div className="row">
                    {live ? <span className="open">Open agent <ArrowRight size={14} /></span>
                      : <span className="wb-mono" style={{ fontSize: 11.5, color: "var(--faint)" }}>{a.badge === "next" ? "Building next" : "In the queue"}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="wb-panel" style={{ marginTop: 22 }}>
            <div className="wb-panel-pad" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ShieldCheck size={18} color="var(--wb-brand)" />
              <span style={{ fontSize: 13.5, color: "var(--muted)" }}>Every agent is governed by a <b style={{ color: "var(--ink)" }}>curated prompt locked by your admin</b> and keeps a human in the loop — nothing is written to your requirements tools without your review.</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <button className="wb-back" onClick={() => setAgent(null)}><ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /> All agents</button>
          <div className="wb-tool-head">
            <div className="ic" style={{ background: active.wash, color: active.accent }}><active.icon size={24} /></div>
            <div>
              <h1>{active.name}</h1>
              <p>{active.tagline}</p>
            </div>
          </div>
          {agent === "extractor" && <ExtractorAgent toast={toast} />}
          {agent === "derivation" && <DerivationAgent toast={toast} />}
        </>
      )}

      <div className={`wb-toast ${toastMsg ? "show" : ""}`}>
        <Check size={16} color="#5fdca0" /> <span>{toastMsg}</span>
      </div>
    </div>
  );
}

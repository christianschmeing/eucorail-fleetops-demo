#!/usr/bin/env node
/**
 * Dispatch the Verify + Perf + Preview workflow and fetch preview URL.
 * - Uses GitHub REST API (workflow_dispatch)
 * - Polls until run is completed (max ~15 min)
 * - Downloads artifacts (state or CHANGESUMMARY), extracts preview URL
 * - Validates root (200/401) and /api/health (200)
 * - Appends result to CHANGESUMMARY.md and prints only: PREVIEW_URL=<url>
 *
 * Falls back to gh-pages raw state if no GITHUB_TOKEN.
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const repoRoot = process.cwd();

function appendSummary(msg) {
  try { writeFileSync(join(repoRoot, 'CHANGESUMMARY.md'), `\n${msg}\n`, { flag: 'a' }); } catch {}
}

function env(name, fallback = '') { return process.env[name] ?? fallback; }

function parseRepoEnv() {
  let rr = env('GITHUB_REPOSITORY', '');
  if (!rr) {
    try {
      const url = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
      const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i);
      if (m) rr = `${m[1]}/${m[2]}`;
    } catch {}
  }
  if (!rr) rr = 'unknown/unknown';
  const [owner, repo] = rr.split('/');
  let ref = env('GITHUB_REF_NAME', '');
  if (!ref) {
    try { ref = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim(); } catch {}
  }
  if (!ref) ref = 'main';
  return { owner, repo, ref };
}

async function ghRequest(path, { method = 'GET', body } = {}) {
  const token = env('GITHUB_TOKEN', '');
  const headers = { 'Accept': 'application/vnd.github+json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = `https://api.github.com${path}`;
  const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`GitHub ${method} ${path} -> ${r.status}`);
  return r;
}

async function fetchJSON(path, opts) { const r = await ghRequest(path, opts); return r.json(); }
async function fetchZip(path) { const r = await ghRequest(path); const ab = await r.arrayBuffer(); return Buffer.from(ab); }

function unzipFindFile(zipBuf, filename) {
  // Minimal ZIP reader: find central directory (EOCD), iterate entries, then read local header and inflate
  function readUInt32LE(buf, off) { return buf.readUInt32LE(off); }
  function readUInt16LE(buf, off) { return buf.readUInt16LE(off); }
  // EOCD signature 0x06054b50
  let eocdOffset = -1;
  for (let i = zipBuf.length - 22; i >= 0 && i > zipBuf.length - 65557; i--) {
    if (zipBuf.readUInt32LE(i) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset < 0) return null;
  const cdSize = readUInt32LE(zipBuf, eocdOffset + 12);
  const cdOffset = readUInt32LE(zipBuf, eocdOffset + 16);
  let p = cdOffset;
  while (p < cdOffset + cdSize) {
    const sig = readUInt32LE(zipBuf, p);
    if (sig !== 0x02014b50) break; // central directory file header
    const compMethod = readUInt16LE(zipBuf, p + 10);
    const fileNameLen = readUInt16LE(zipBuf, p + 28);
    const extraLen = readUInt16LE(zipBuf, p + 30);
    const commentLen = readUInt16LE(zipBuf, p + 32);
    const relOffsetLH = readUInt32LE(zipBuf, p + 42);
    const name = zipBuf.slice(p + 46, p + 46 + fileNameLen).toString('utf-8');
    if (name === filename) {
      // Local file header at relOffsetLH
      const lhSig = readUInt32LE(zipBuf, relOffsetLH);
      if (lhSig !== 0x04034b50) return null;
      const lhNameLen = readUInt16LE(zipBuf, relOffsetLH + 26);
      const lhExtraLen = readUInt16LE(zipBuf, relOffsetLH + 28);
      const compSize = readUInt32LE(zipBuf, relOffsetLH + 18);
      const dataOffset = relOffsetLH + 30 + lhNameLen + lhExtraLen;
      const compData = zipBuf.slice(dataOffset, dataOffset + compSize);
      if (compMethod === 0) {
        return compData; // stored
      } else if (compMethod === 8) {
        return inflateRawSync(compData);
      } else {
        return null;
      }
    }
    p += 46 + fileNameLen + extraLen + commentLen;
  }
  return null;
}

function extractPreviewFromText(text) {
  const m = text.match(/Preview Web:\s*(https?:\/\/[^\s]+)\s*\(status=(\d+)\)/);
  return m ? { url: m[1], status: Number(m[2]) } : { url: '', status: 0 };
}

async function validatePreview(url) {
  if (!url) return { root: 0, health: 0 };
  const to = (ms) => { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms); return { ctl, t }; };
  let root = 0, health = 0;
  try { const { ctl, t } = to(3000); const r = await fetch(url.replace(/\/$/, '') + '/', { signal: ctl.signal }); clearTimeout(t); root = r.status; } catch {}
  try { const { ctl, t } = to(3000); const r = await fetch(url.replace(/\/$/, '') + '/api/health', { signal: ctl.signal }); clearTimeout(t); health = r.status; } catch {}
  return { root, health };
}

async function main() {
  const token = env('GITHUB_TOKEN', '');
  const { owner, repo, ref } = parseRepoEnv();
  let previewUrl = '';
  let note = '';

  if (!token) {
    appendSummary('[SKIPPED:dispatch-no-token]');
    // try gh-pages state
    try {
      const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/gh-pages/state/project-state.json`);
      if (raw.ok) {
        const j = await raw.json();
        if (j?.preview?.web) previewUrl = j.preview.web;
      }
    } catch {}
  } else {
    // Trigger workflow dispatch
    try {
      await ghRequest(`/repos/${owner}/${repo}/actions/workflows/verify_preview.yml/dispatches`, { method: 'POST', body: { ref } });
    } catch (e) {
      appendSummary(`[SKIPPED:dispatch] ${e?.message || String(e)}`);
    }
    // Poll latest run for this workflow + branch
    let runId = 0; let tries = 0; let status = '';
    while (tries++ < 90) {
      try {
        const data = await fetchJSON(`/repos/${owner}/${repo}/actions/workflows/verify_preview.yml/runs?branch=${encodeURIComponent(ref)}&per_page=1`);
        const wr = (data?.workflow_runs || [])[0];
        if (wr) { runId = wr.id; status = wr.status; }
        if (wr && status === 'completed') break;
      } catch {}
      await new Promise(r => setTimeout(r, 10000));
    }
    if (!runId || status !== 'completed') {
      appendSummary('[SKIPPED:dispatch-timeout]');
    } else {
      // Get artifacts
      try {
        const arts = await fetchJSON(`/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`);
        const list = Array.isArray(arts?.artifacts) ? arts.artifacts : [];
        const stateArt = list.find(a => String(a.name).toLowerCase().includes('state'));
        const csArt = list.find(a => String(a.name).toLowerCase().includes('change'));
        // Prefer state/project-state.json
        if (stateArt) {
          const zip = await fetchZip(`/repos/${owner}/${repo}/actions/artifacts/${stateArt.id}/zip`);
          const buf = unzipFindFile(zip, 'project-state.json');
          if (buf) {
            try { const j = JSON.parse(buf.toString('utf-8')); if (j?.preview?.web) previewUrl = j.preview.web; } catch {}
          }
        }
        if (!previewUrl && csArt) {
          const zip = await fetchZip(`/repos/${owner}/${repo}/actions/artifacts/${csArt.id}/zip`);
          const buf = unzipFindFile(zip, 'CHANGESUMMARY.md');
          if (buf) {
            const { url } = extractPreviewFromText(buf.toString('utf-8'));
            previewUrl = url;
          }
        }
      } catch {}
    }
  }

  // Validate and write summary
  const { root, health } = await validatePreview(previewUrl);
  if (previewUrl) {
    appendSummary(`CI Preview: ${previewUrl} (status_root=${root} health=${health})`);
  }

  // Console output single line
  process.stdout.write(`PREVIEW_URL=${previewUrl}\n`);
}

await main().catch((e) => {
  appendSummary(`[SKIPPED:dispatch-run] ${e?.message || String(e)}`);
  process.stdout.write('PREVIEW_URL=\n');
});





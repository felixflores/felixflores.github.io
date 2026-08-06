#!/usr/bin/env python3
"""Regenerate lab.html from the tunnels CLI.

Run on the machine that hosts the tunnel:
    python3 tools/gen_lab.py

Reads `tunnels routes --json` for the hostname -> port map and
`tunnels service scan` for what is actually listening, then writes lab.html
next to it. Re-run after adding or removing a route and the page resyncs.

Liveness in the published page comes from https://status.felixflor.es/ at
runtime; the values baked in here are only the initial state.
"""
import html
import json
import os
import re
import subprocess
import sys

TUNNEL = "og"
STATUS_URL = "https://status.felixflor.es/"
# Routes that exist but must never be linked from a public page.
STAGING = {"monica", "jerry", "kita"}

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Descriptions read off each service's own page.
SELF_HOSTED = {
    "super-vision":    ("fa-eye",          "Super Color Vision", "Find the odd tile as the shade difference shrinks each round."),
    "hibla":           ("fa-font",         "Hibla",              "A typeface built so letters stay countable. Type specimen."),
    "wesley":          ("fa-gamepad",      "The Wesley",         "Feature-request history for a game built to order."),
    "una":             ("fa-shapes",       "Una's Toy Box",      "A small pile of toys. Pick one and play."),
    "stats-collector": ("fa-chart-simple", "Video Stats Report", "Reporting over video stats."),
    "public-square":   ("fa-users",        "Public Square",      "A simulation of a public square."),
}

STATIC = [
    ("buddhabrot_bg.html",    "fa-burst",         "Nebulabrot Explorer",      "Interactive Buddhabrot fractal with parallel Web Workers."),
    ("unaisa.html",           "fa-scroll",        "Unaisa Protocol",          "Decentralized content addressing via Merkle chains."),
    ("alien-spacecraft.html", "fa-dna",           "Compressing Civilization", "Encoding a civilization into DNA and mailing it as a spore."),
    ("experiment.html",       "fa-brain",         "TLog — Thought Space",     "An LLM running in your browser. Ask anything, watch it think."),
    ("journal-v2.html",       "fa-code-branch",   "Branch Journal v2",        "Journalling that branches, with Phi-3.5 or DeepSeek R1 running locally."),
    ("journal.html",          "fa-code-branch",   "Branch Journal",           "The first version."),
    ("philosopher-chat.html", "fa-comments",      "Philosopher Chat",         "Five philosophers argue your question. Socrates questions, Nietzsche unmasks."),
    ("tiltrush.html",         "fa-mobile-screen", "TiltRush",                 "Motion-controlled mobile game."),
    ("asteroids.html",        "fa-meteor",        "Asteroids",                "Arrow keys to thrust, space to shoot."),
    ("blinking.html",         "fa-eye-slash",     "Blinking Contest",         "Two cropped eyes, a countdown, and a timer. Try not to blink."),
    ("tinnitus-therapy.html", "fa-ear-listen",    "Tinnitus Therapy",         "Notched sound generator for relief."),
]

# Jokes, not content — listed so nobody clicks expecting what the title promises.
ELSEWHERE = [
    ("blog.html",   "fa-hammer",       "Blog",   "Under construction since approximately 1999."),
    ("photos.html", "fa-camera-retro", "Photos", "Also under construction. Visitor #000069 and counting."),
]


def tunnels(*args):
    for exe in ("/usr/local/bin/tunnels", "/opt/homebrew/bin/tunnels", "tunnels"):
        try:
            out = subprocess.run([exe, *args], capture_output=True, text=True, timeout=25)
            if out.returncode == 0:
                return out.stdout
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    sys.exit("could not run the tunnels CLI — run this on the tunnel host")


def build_map():
    routes = json.loads(tunnels("routes", "--json"))
    scan = {}
    for line in tunnels("service", "scan").splitlines():
        m = re.match(r"^(\S+)\s+(\d+)\s*$", line.strip())
        if m:
            scan.setdefault(int(m.group(2)), m.group(1))

    rows = []
    for r in routes:
        host, svc = r["hostname"], r["service"]
        if host == "(catch-all)" or not svc.startswith("http"):
            continue
        sub = host.split(".")[0]
        if sub in STAGING or sub not in SELF_HOSTED:
            continue
        port = int(svc.rsplit(":", 1)[1])
        rows.append({"sub": sub, "port": port, "up": port in scan})
    rows.sort(key=lambda r: list(SELF_HOSTED).index(r["sub"]))
    return rows


def card(href, icon, name, desc, arrow, external=False, svc=None):
    ext = ' target="_blank" rel="noopener noreferrer"' if external else ""
    attr = f' data-svc="{html.escape(svc)}"' if svc else ""
    dot = '<span class="dot" aria-hidden="true"></span>' if svc else ""
    return f'''      <li class="row-item"{attr}>
        <a class="row" href="{html.escape(href)}"{ext}>
          <i class="fa-solid {icon} row-icon"></i>
          <span class="row-text">
            <span class="row-name">{html.escape(name)}{dot}</span>
            <span class="row-desc">{html.escape(desc)}</span>
          </span>
          <span class="row-arrow">{arrow}</span>
        </a>
      </li>'''


TEMPLATE = r'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lab — Felix Flores</title>
  <meta name="description" content="Experiments, utilities, and things running on a laptop at home.">
  <link rel="icon" type="image/x-icon" href="favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      background: #0a0a0a; color: #f5f5f7; line-height: 1.6;
      -webkit-font-smoothing: antialiased; min-height: 100vh;
    }

    .wrap { max-width: 720px; margin: 0 auto; padding: 80px 24px 60px; }

    .back {
      display: inline-flex; align-items: center; gap: 8px;
      color: #6e6e73; text-decoration: none; font-size: 13px;
      margin-bottom: 40px; transition: color 0.2s ease;
    }
    .back:hover { color: #f5f5f7; }

    h1 { font-size: 34px; font-weight: 600; letter-spacing: -1px; margin-bottom: 8px; }
    .lede { color: #6e6e73; font-size: 16px; margin-bottom: 48px; }

    .section-head {
      display: flex; align-items: baseline; justify-content: space-between;
      gap: 12px; margin: 44px 0 6px;
    }
    h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #86868b; }
    .section-note { font-size: 12px; color: #4a4a4d; }
    .section-sub { font-size: 13px; color: #4a4a4d; margin-bottom: 14px; transition: color 0.3s ease; }

    ul { list-style: none; }

    .row {
      display: flex; align-items: center; gap: 16px; padding: 14px 16px;
      background: rgba(10, 10, 12, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px; text-decoration: none; color: inherit;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .row-item + .row-item { margin-top: 8px; }
    .row:hover {
      background: rgba(10, 10, 12, 0.7);
      border-color: rgba(255, 255, 255, 0.12);
      transform: translateX(3px);
    }

    .row-icon { font-size: 16px; color: rgba(255, 255, 255, 0.45); width: 22px; text-align: center; flex-shrink: 0; }
    .row-text { display: flex; flex-direction: column; flex-grow: 1; min-width: 0; }
    .row-name { font-size: 15px; font-weight: 600; color: #f5f5f7; letter-spacing: -0.2px; }
    .row-desc { font-size: 13px; color: #86868b; line-height: 1.4; }
    .row-arrow { color: #4af; font-size: 14px; opacity: 0; transition: opacity 0.2s ease; flex-shrink: 0; }
    .row:hover .row-arrow { opacity: 1; }

    /* live status, filled in from the status endpoint */
    .dot {
      display: inline-block; width: 6px; height: 6px; border-radius: 50%;
      margin-left: 9px; vertical-align: middle;
      background: #3a3a3c; transition: background 0.3s ease, box-shadow 0.3s ease;
    }
    .row-item[data-state="up"] .dot { background: #32d74b; box-shadow: 0 0 8px rgba(50,215,75,0.7); }
    .row-item[data-state="down"] .dot { background: #48484a; }
    .row-item[data-state="down"] .row { opacity: 0.42; }
    .row-item[data-state="down"] .row:hover { opacity: 0.62; }

    .footer { margin-top: 64px; text-align: center; color: #3a3a3c; font-size: 13px; }
    .footer a { color: #4af; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }

    @media (max-width: 500px) {
      .wrap { padding: 48px 18px 40px; }
      h1 { font-size: 27px; }
      .row-arrow { display: none; }
    }
  </style>
</head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-R0M5DGW99S"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-R0M5DGW99S');
</script>
<body>
  <div class="wrap">
    <a class="back" href="index.html">← Felix Flores</a>

    <h1>Lab</h1>
    <p class="lede">Experiments, utilities, and half-finished things.</p>

    <div class="section-head">
      <h2>Running now</h2>
      <span class="section-note">self-hosted</span>
    </div>
    <p class="section-sub" id="hostedNote">These run on a laptop at home. Checking what's awake&hellip;</p>
    <ul>
__HOSTED__
    </ul>

    <div class="section-head">
      <h2>Experiments</h2>
    </div>
    <p class="section-sub">Static, always up.</p>
    <ul>
__STATIC__
    </ul>

    <div class="section-head">
      <h2>Elsewhere</h2>
    </div>
    <ul>
__ELSEWHERE__
    </ul>

    <div class="footer">
      <a href="mailto:holla@felixflor.es">holla@felixflor.es</a>
    </div>
  </div>

  <script>
    // GitHub Pages cannot tell a live origin from a 502 across origins: a
    // no-cors fetch resolves opaque either way, and none of these serve a
    // probe-able image. So the tunnel host answers for itself, with CORS.
    // Fetch failing is itself the signal that the laptop is unreachable.
    (function () {
      var note = document.getElementById('hostedNote');
      var items = document.querySelectorAll('.row-item[data-svc]');
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () { ctl && ctl.abort(); }, 6000);

      fetch('__STATUS_URL__', { cache: 'no-store', signal: ctl && ctl.signal })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (d) {
          clearTimeout(timer);
          var up = 0, total = 0;
          items.forEach(function (li) {
            var state = d.services[li.getAttribute('data-svc')];
            if (typeof state !== 'boolean') return;
            total++; if (state) up++;
            li.setAttribute('data-state', state ? 'up' : 'down');
          });
          note.textContent = total
            ? up + ' of ' + total + " awake right now. These run on a laptop at home."
            : "These run on a laptop at home.";
        })
        .catch(function () {
          clearTimeout(timer);
          items.forEach(function (li) { li.setAttribute('data-state', 'down'); });
          note.textContent = "Can't reach the home server — these are all asleep. Try later.";
        });
    })();
  </script>
</body>
</html>
'''


def main():
    rows = build_map()
    hosted = "\n".join(
        card("https://%s.felixflor.es" % r["sub"], *SELF_HOSTED[r["sub"]], "↗",
             external=True, svc=r["sub"])
        for r in rows)
    page = (TEMPLATE
            .replace("__HOSTED__", hosted)
            .replace("__STATIC__", "\n".join(card(p, i, n, d, "→") for p, i, n, d in STATIC))
            .replace("__ELSEWHERE__", "\n".join(card(p, i, n, d, "→") for p, i, n, d in ELSEWHERE))
            .replace("__STATUS_URL__", STATUS_URL))

    out = os.path.join(REPO, "lab.html")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(page)

    print("wrote %s" % out)
    for r in rows:
        print("  %-16s :%-6d %s" % (r["sub"], r["port"], "listening" if r["up"] else "DOWN"))
    print("  %d static, %d elsewhere" % (len(STATIC), len(ELSEWHERE)))


if __name__ == "__main__":
    main()

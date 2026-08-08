/* ============================================================
   AMBIENT TAI CHI — the music, made visible (and audible)
   · a slow drifting ascii waveform in the hero
   · an optional generative drone (web audio), off by default
   ============================================================ */
(function () {

  /* all motion comes to rest — after 2 minutes, or after a 30-second
     taste when the visitor prefers reduced motion */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var REST_AFTER = reduced ? 30000 : 120000;
  if (reduced) {
    setTimeout(function () { document.body.classList.add("rest"); }, REST_AFTER);
  }

  /* ---------- drifting ascii wave ---------- */
  var wave = document.getElementById("wave");
  var glyphs = ["_", ".", "·", "-", "~", "¯"]; /* low → high */
  var t = 0, chars = 60;

  function glyphWidth() {
    var cs = getComputedStyle(wave);
    var c = document.createElement("canvas").getContext("2d");
    c.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    return c.measureText("~").width || 9;
  }

  function fit() {
    chars = Math.max(16, Math.floor(wave.clientWidth / glyphWidth()));
    draw();
  }

  function draw() {
    var out = "";
    for (var x = 0; x < chars; x++) {
      /* two slow sines drifting against each other — never quite repeats */
      var v = Math.sin(x * 0.22 + t) * 0.6 + Math.sin(x * 0.07 - t * 0.6) * 0.4;
      out += glyphs[Math.round((v + 1) / 2 * (glyphs.length - 1))];
    }
    wave.textContent = out;
  }

  if (wave) {
    fit();
    window.addEventListener("resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    var waveTimer = setInterval(function () { t += 0.11; draw(); }, 160);
    setTimeout(function () { clearInterval(waveTimer); }, REST_AFTER);
  }

  /* ---------- the room — the form flows down the row ---------- */
  var sceneLayers = [document.getElementById("scene"), document.getElementById("scene-b")];
  if (sceneLayers[0] && sceneLayers[1]) {
    /* each pose has its own stance — open, feet together, weight left, stepping */
    var poses = [
      ["   o   ", "  /|\\  ", " _/ \\_ "],
      [" __o__ ", "   |   ", "  /_\\  "],
      ["   o   ", "  (|)  ", " _/_\\  "],
      [",__o__|", "   |   ", "  /_\\_ "]
    ];
    /* musician + synth — knobs, a wave display the hands stir, a stand.
       20 columns each, so there is air between the synth and the first pair. */
    var edge = [
      "        ,_____,     ",
      "   o    |o o o|     ",
      "  /|____|<span class=\"amb\">~~~~~</span>|     ",
      " _/ \\_  _|___|_     "
    ];
    var step = 0, at = 0, sceneFront = 0;
    function ballify(s) {
      return s.replace("(", '<span class="ball">(</span>')
              .replace(")", '<span class="ball">)</span>');
    }
    /* flip a pose horizontally so a partner can face the other way */
    function mirror(s) {
      var flip = { "/": "\\", "\\": "/", "(": ")", ")": "(" };
      return s.split("").reverse().map(function (c) { return flip[c] || c; }).join("");
    }
    /* join two poses as a facing pair, one space apart at their closest point */
    function pairUp(a, b) {
      var L = poses[a], R = poses[b].map(mirror), gap = 99, r;
      for (r = 0; r < 3; r++) {
        gap = Math.min(gap, L[r].match(/ *$/)[0].length + R[r].match(/^ */)[0].length);
      }
      var trim = Math.max(0, gap - 1), rows = [];
      for (r = 0; r < 3; r++) {
        var cut = Math.min(trim, L[r].match(/ *$/)[0].length);
        rows.push(L[r].slice(0, L[r].length - cut) + R[r].slice(trim - cut));
      }
      return rows;
    }
    function renderScene() {
      /* the air — same drifting water as the hero wave, spaced out */
      var air = [];
      for (var x = 0; x < 17; x++) {
        var v = Math.sin(x * 0.7 + at) * 0.6 + Math.sin(x * 0.26 - at * 0.6) * 0.4;
        air.push(glyphs[Math.round((v + 1) / 2 * (glyphs.length - 1))]);
      }
      var lines = [edge[0] + '<span class="air">' + air.join(" ") + "</span>"];
      /* each figure is one beat behind the next — the form travels down the row.
         The four stand as two pairs, partners mirrored to face each other,
         close enough to touch — pushing hands, practicing together. */
      var left = pairUp(step % poses.length, (step + 1) % poses.length);
      var right = pairUp((step + 2) % poses.length, (step + 3) % poses.length);
      var mid = new Array(15).join(" ");
      for (var r = 0; r < 3; r++) {
        var l = left[r], q = right[r];
        while (l.length < 13) l += " ";
        while (q.length < 13) q = " " + q;
        lines.push(edge[r + 1] + ballify(l) + mid + ballify(q));
      }
      lines.push('<span class="gnd">' + new Array(61).join("¯") + "</span>");
      return lines.join("\n");
    }
    /* dissolve between states: new frame fades in over the old one */
    var sceneTimer = setInterval(function () {
      step++; at += 0.5;
      var back = sceneLayers[1 - sceneFront];
      back.innerHTML = renderScene();
      back.style.opacity = 1;
      sceneLayers[sceneFront].style.opacity = 0;
      sceneFront = 1 - sceneFront;
    }, 1800);
    setTimeout(function () { clearInterval(sceneTimer); }, REST_AFTER);
  }

  /* ---------- a hand on the water — movement wakes the page ---------- */
  var wakeTimer = null;
  function wake() {
    document.body.classList.add("awake");
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(function () {
      document.body.classList.remove("awake"); /* breathing resumes from the top */
    }, 4000);
  }
  window.addEventListener("mousemove", wake);
  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("touchstart", wake, { passive: true });

  /* ---------- generative drone ---------- */
  var btn = document.getElementById("sound");
  if (!btn) return;

  var audio = { ctx: null, master: null, oscs: [] };

  /* A sus2 voicing — open, unresolved, ambient */
  var VOICES = [110.00, 164.81, 220.00, 246.94, 329.63];

  function startDrone() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    var ctx = audio.ctx = audio.ctx || new AC();
    ctx.resume();
    var now = ctx.currentTime;

    var master = audio.master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.16, now + 6); /* slow bloom */

    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1100;
    master.connect(lp);
    lp.connect(ctx.destination);

    VOICES.forEach(function (f, i) {
      var o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.detune.value = i % 2 ? 3 : -3; /* gentle beating between voices */

      var g = ctx.createGain();
      g.gain.value = 0.14;

      /* each voice swells and recedes at its own slow rate */
      var lfo = ctx.createOscillator();
      lfo.frequency.value = 0.02 + i * 0.013;
      var depth = ctx.createGain();
      depth.gain.value = 0.09;
      lfo.connect(depth);
      depth.connect(g.gain);

      o.connect(g);
      g.connect(master);
      o.start(now);
      lfo.start(now + i); /* staggered, so the voices never swell together */
      audio.oscs.push(o, lfo);
    });
    return true;
  }

  function stopDrone() {
    var ctx = audio.ctx, master = audio.master;
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 2.5);
    var oscs = audio.oscs;
    audio.oscs = [];
    setTimeout(function () {
      oscs.forEach(function (o) { try { o.stop(); } catch (e) {} });
      master.disconnect();
    }, 2700);
  }

  var on = false;
  btn.addEventListener("click", function () {
    if (!on && !startDrone()) return;
    if (on) stopDrone();
    on = !on;
    btn.setAttribute("aria-pressed", String(on));
    if (wave) wave.classList.toggle("live", on);
  });

})();

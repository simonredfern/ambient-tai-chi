/* ============================================================
   AMBIENT TAI CHI — the music, made visible (and audible)
   · a slow drifting ascii waveform in the hero
   · an optional generative drone (web audio), off by default
   ============================================================ */
(function () {

  /* ---------- drifting ascii wave ---------- */
  var wave = document.getElementById("wave");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    if (!reduced) setInterval(function () { t += 0.11; draw(); }, 160);
  }

  /* ---------- the room — the form flows down the row ---------- */
  var scene = document.getElementById("scene");
  if (scene && !reduced) {
    var poses = [
      ["   o   ", "  /|\\  ", "  / \\  "],
      [" __o__ ", "   |   ", "  / \\  "],
      ["   o   ", "  (|)  ", "  / \\  "],
      [",__o__|", "   |   ", " _/ \\  "],
      ["   o   ", "  /|\\  ", " _/ \\_ "]
    ];
    /* musician + synth, one string per line (16 columns each) */
    var edge = [
      "       .------. ",
      "   o   |<span class=\"amb\">* * *</span> | ",
      "  /|___|______| ",
      "  / \\    |  |   "
    ];
    var step = 0, at = 0;
    function ballify(s) {
      return s.replace("(", '<span class="ball">(</span>')
              .replace(")", '<span class="ball">)</span>');
    }
    function drawScene() {
      /* the air — same drifting water as the hero wave, spaced out */
      var air = [];
      for (var x = 0; x < 17; x++) {
        var v = Math.sin(x * 0.7 + at) * 0.6 + Math.sin(x * 0.26 - at * 0.6) * 0.4;
        air.push(glyphs[Math.round((v + 1) / 2 * (glyphs.length - 1))]);
      }
      var lines = [edge[0] + '<span class="air">' + air.join(" ") + "</span>"];
      /* each figure is one beat behind the next — the form travels down the row */
      for (var r = 0; r < 3; r++) {
        var cells = [];
        for (var i = 0; i < 4; i++) {
          cells.push(ballify(poses[(step + i) % poses.length][r]));
        }
        lines.push(edge[r + 1] + cells.join("    "));
      }
      lines.push('<span class="gnd">' + new Array(57).join("¯") + "</span>");
      scene.innerHTML = lines.join("\n");
    }
    drawScene();
    setInterval(function () { step++; at += 0.5; drawScene(); }, 1800);
  }

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
    master.gain.linearRampToValueAtTime(0.32, now + 6); /* slow bloom */

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
    btn.textContent = on ? "[ sound: on ]" : "[ sound: off ]";
    btn.setAttribute("aria-pressed", String(on));
    if (wave) wave.classList.toggle("live", on);
  });

})();

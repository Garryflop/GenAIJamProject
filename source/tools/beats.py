import subprocess, numpy as np, json
D = r"C:/Users/harry/Downloads/RMaT/ProjectSiren/assets/audio/"
SR = 11025; N = 1024; HOP = 128; FPS = SR / HOP
def load(name):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', D + name + '.mp3', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
out = {}
for name in ('calm', 'joy', 'sad', 'rage'):
    x = load(name)
    fr = np.lib.stride_tricks.sliding_window_view(x, N)[::HOP] * np.hanning(N)
    S = np.log1p(np.abs(np.fft.rfft(fr, axis=1)))
    freqs = np.fft.rfftfreq(N, 1 / SR)
    flux = np.maximum(0, np.diff(S, axis=0)); flux = np.vstack([np.zeros((1, S.shape[1])), flux])
    onset = flux.sum(1); low = flux[:, freqs < 180].sum(1)
    # точный период удара: перебор 100–125 BPM (и кратных) по «гребёнке»
    best = None
    for bpm in np.arange(70, 160, 0.02):
        T = 60 / bpm * FPS
        idx = np.arange(0, len(onset) - 1, T)
        for ph in np.linspace(0, T, 24, endpoint=False):
            pass
        # быстрый критерий: автокорреляция на лаге T (и 2T)
        l1 = int(round(T)); l2 = int(round(2 * T))
        if l2 >= len(onset): continue
        a = np.dot(onset[:-l2], onset[l1:len(onset) - l2 + l1]) + 0.5 * np.dot(onset[:-l2], onset[l2:])
        if best is None or a > best[0]: best = (a, bpm)
    bpm = best[1]
    # сравним кандидаты кратности к 112
    cands = {}
    for mul in (0.5, 2 / 3, 1, 1.5, 2):
        b = bpm * mul
        if 95 <= b <= 130: cands[round(b, 2)] = mul
    T = 60 / bpm
    # фаза удара: максимизируем сумму атак на сетке
    Tf = T * FPS
    phs = np.linspace(0, Tf, 200, endpoint=False)
    sc = [onset[np.round(np.arange(p, len(onset) - 1, Tf)).astype(int)].sum() for p in phs]
    ph = phs[int(np.argmax(sc))] / FPS
    # сильная доля такта (4/4): где больше низа (бочка)
    bar = [low[np.round(np.arange((ph + k * T) * FPS, len(low) - 1, 4 * Tf)).astype(int)].sum() for k in range(4)]
    down = ph + int(np.argmax(bar)) * T
    blk = int(SR * 0.25); rms = np.sqrt(np.array([np.mean(x[i:i + blk] ** 2) for i in range(0, len(x) - blk, blk)]) + 1e-12)
    db = 20 * np.log10(rms / np.percentile(rms, 90))
    # начало затухания в конце: последний момент, где громкость ещё > -6 дБ от типичной
    tail = len(db) - 1
    while tail > 0 and db[tail] < -6: tail -= 1
    fade = tail * 0.25
    out[name] = {'dur': round(len(x) / SR, 2), 'bpm_raw': round(bpm, 2), 'cands112': cands, 'beat': round(T, 5), 'phase': round(ph, 3), 'downbeat': round(down, 3), 'fadeStart': fade,
                 'barScores': [round(float(b), 1) for b in bar]}
print(json.dumps(out, indent=1))

import subprocess, numpy as np, json, math
D = r"C:/Users/harry/Downloads/RMaT/ProjectSiren/assets/audio/"
SR = 11025; N = 1024; HOP = 64; FPS = SR / HOP
META = {  # из beats.py
    'calm': dict(beat=0.53986, down=0.756, minStart=8.2, maxEnd=157.0),
    'joy': dict(beat=0.54855, down=0.466, minStart=1.5, maxEnd=132.5),
    'sad': dict(beat=0.54269, down=1.861, minStart=1.5, maxEnd=156.0),
    'rage': dict(beat=0.53696, down=1.987, minStart=8.5, maxEnd=127.5),
}
def load(name):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', D + name + '.mp3', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
res = {}
for name, m in META.items():
    x = load(name)
    fr = np.lib.stride_tricks.sliding_window_view(x, N)[::HOP] * np.hanning(N)
    S = np.log1p(np.abs(np.fft.rfft(fr, axis=1))); freqs = np.fft.rfftfreq(N, 1 / SR)
    fl = np.maximum(0, np.diff(S, axis=0)); onset = np.concatenate([[0], fl.sum(1)])
    def snap(t, win=0.1):
        a, b = int((t - win) * FPS), int((t + win) * FPS)
        return (a + int(np.argmax(onset[a:b]))) / FPS
    bar = 4 * m['beat']
    k0 = math.ceil((m['minStart'] - m['down']) / bar); start = m['down'] + k0 * bar
    nb = math.floor((m['maxEnd'] - start) / bar); nb -= nb % 4  # кратно 4 тактам (фраза)
    end = start + nb * bar
    s2, e2 = snap(start), snap(end)
    # похожесть фрагментов вокруг точек петли (чем выше, тем незаметнее прыжок)
    w = int(1.0 * FPS); A = onset[int(e2 * FPS) - w:int(e2 * FPS)]; B = onset[int(s2 * FPS) - w:int(s2 * FPS)]
    sim = float(np.corrcoef(A, B)[0, 1]) if len(B) == len(A) and len(A) > 1 else None
    res[name] = {'loopStart': round(s2, 3), 'loopEnd': round(e2, 3), 'bars': nb, 'gridStart': round(start, 3), 'gridEnd': round(end, 3), 'jumpSimilarity': round(sim, 2) if sim is not None else None}
    if name == 'rage': res[name]['breakAt'] = 92.75; res[name]['slamAt'] = 96.5
    if name in ('sad', 'joy'):
        for t0 in ((138,) if name == 'sad' else (100, 104)):
            k = round((t0 - m['down']) / bar); res[name]['phraseNear%d' % t0] = round(snap(m['down'] + k * bar), 2)
print(json.dumps(res, indent=1))

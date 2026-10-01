import subprocess, numpy as np, json, sys
from PIL import Image, ImageDraw, ImageFont
D = r"C:/Users/harry/Downloads/RMaT/ProjectSiren/assets/audio/"
SR = 11025
NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
def load(name):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', D + name + '.mp3', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
res = {}; envs = {}
for name in ('calm', 'joy', 'sad', 'rage'):
    x = load(name); n = 1024; hop = 256
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * np.hanning(n)
    S = np.abs(np.fft.rfft(frames, axis=1))
    flux = np.maximum(0, np.diff(np.log1p(S), axis=0)).sum(1); flux = np.concatenate([[0], flux])
    fps = SR / hop
    # темп: автокорреляция огибающей атак
    f = flux - flux.mean(); ac = np.correlate(f[:int(fps * 60)], f[:int(fps * 60)], 'full')[len(f[:int(fps * 60)]) - 1:]
    lags = np.arange(len(ac)) / fps; bpms = 60 / np.maximum(lags, 1e-9)
    m = (bpms > 70) & (bpms < 180); best = np.argmax(ac * m); bpm = bpms[best]
    # тональность: профиль высот
    freqs = np.fft.rfftfreq(n, 1 / SR); sel = (freqs > 60) & (freqs < 2000)
    midi = 69 + 12 * np.log2(freqs[sel] / 440); pc = np.round(midi).astype(int) % 12
    chroma = np.zeros(12); energy = (S[:, sel] ** 2).sum(0)
    for i in range(12): chroma[i] = energy[pc == i].sum()
    chroma /= chroma.max()
    best_key = max([(np.corrcoef(np.roll(MAJ, k), chroma)[0, 1], NOTES[k] + ' major') for k in range(12)] + [(np.corrcoef(np.roll(MIN, k), chroma)[0, 1], NOTES[k] + ' minor') for k in range(12)])
    # громкость по полсекунды
    blk = int(SR * 0.5); rms = np.sqrt(np.array([np.mean(x[i:i + blk] ** 2) for i in range(0, len(x) - blk, blk)]) + 1e-12)
    db = 20 * np.log10(rms / rms.max())
    envs[name] = (db, flux, fps, S, freqs)
    res[name] = {'dur': round(len(x) / SR, 1), 'bpm': round(float(bpm), 1), 'key': best_key[1], 'keyConf': round(float(best_key[0]), 2),
                 'first_loud_s': float(np.argmax(db > -12) * 0.5), 'last_loud_s': float((len(db) - np.argmax(db[::-1] > -12)) * 0.5)}
print(json.dumps(res, indent=1, ensure_ascii=False))
# картинка: громкость + спектрограмма на каждый трек
Wd, Hr = 1400, 220
img = Image.new('RGB', (Wd, Hr * 4 + 10), (12, 18, 22)); dr = ImageDraw.Draw(img)
for r, name in enumerate(('calm', 'joy', 'sad', 'rage')):
    db, flux, fps, S, freqs = envs[name]; y0 = r * Hr + 5
    dur = res[name]['dur']; px_s = (Wd - 60) / 170
    # спектрограмма (низ 0–3 кГц)
    band = S[:, freqs < 3000]; cols = int(dur * px_s)
    for cx in range(cols):
        i = int(cx / px_s * fps);
        if i >= len(band): break
        col = np.log1p(band[i]) ; col = col / (np.log1p(band).max() + 1e-9)
        for cy in range(0, 120, 2):
            v = col[int((119 - cy) / 120 * (len(col) - 1))]; c = int(min(255, v * 330))
            dr.rectangle([50 + cx, y0 + 60 + cy, 50 + cx, y0 + 61 + cy], fill=(c // 3, c // 2, c))
    pts = [(50 + i * 0.5 * px_s, y0 + 55 - max(-40, d) * -1.2) for i, d in enumerate(db)]
    dr.line(pts, fill=(255, 140, 190), width=2)
    for s in range(0, int(dur) + 1, 10):
        x = 50 + s * px_s; dr.line([(x, y0 + 5), (x, y0 + 185)], fill=(40, 60, 70)); dr.text((x + 2, y0 + 188), str(s), fill=(150, 180, 190))
    dr.text((4, y0 + 5), name, fill=(255, 220, 120))
    dr.text((4, y0 + 20), '%s bpm' % res[name]['bpm'], fill=(180, 220, 220))
img.save(r"C:/Users/harry/AppData/Local/Temp/claude/c--Users-harry-Downloads-RMaT/5c34d472-e0e6-4ee9-9641-aae3789ae538/scratchpad/audio_map.png")

// Аудио-манифест Project SIREN. Файлы лежат рядом (assets/audio/). Нет файла — работает встроенный синтез.
window.AUDIO_MANIFEST = {
  music_menu: 'calm.mp3',   // главное меню — версия Calm целиком, со вступлением
  music_calm: 'calm.mp3',   // Скучает / нейтрал
  music_joy: 'joy.mp3',     // Радость
  music_sad: 'sad.mp3',     // Грусть
  music_rage: 'rage.mp3',   // Ярость
  // Эффекты: sfx_<имя>: 'файл' — pick, drop, thud, throw, splash, chomp, coin, knock, poke, squeak, scream, squish,
  // good, bad, gross, echo, giggle, hum, crack, shatter, buy, tube, love, record, bonusEnd, perfect, fail, click, jump
};

// Разметка треков (секунды). Посчитано анализом: темп, сильные доли, петли — по целым тактам
// между вступлением и финальным затуханием. Можно подвинуть на слух.
//   beat      — длительность одной доли (60 / BPM)
//   loopStart — откуда повторять (сильная доля после вступления)
//   loopEnd   — где прыгать обратно (сильная доля перед затуханием)
window.MUSIC_META = {
  calm: { beat: 0.53986, loopStart: 9.462, loopEnd: 156.224 },   // ~111 BPM, до 9.5 c вступление без баса
  joy:  { beat: 0.54855, loopStart: 2.670, loopEnd: 125.527 },   // ~109 BPM
  sad:  { beat: 0.54269, loopStart: 1.829, loopEnd: 149.415 },   // ~111 BPM
  rage: { beat: 0.53696, loopStart: 10.559, loopEnd: 122.247 },  // ~112 BPM, до 10.5 c вступление-сирена
};

// Музыка концовок — отрезки тех же треков (секунды трека; stopAt — секунды от начала концовки).
window.ENDING_MUSIC = {
  1: { track: 'sad', from: 138.6, fadeIn: 2 },                        // «Тишина»: естественный финал Sad, затихает сам (~23 c)
  2: { track: 'rage', from: 89.35, fadeIn: 0.5, stopAt: 7.1, fadeOut: 0.25 }, // «Колба мала»: провал трека (92.75 c) ровно на укусе,
                                                                      //   тишина на чёрном экране, обрыв перед ударом 96.5 c
  3: { track: 'joy', from: 103.68, fadeIn: 1.5 },                     // «На руках»: светлая часть Joy → её естественный финал (~30 c)
};

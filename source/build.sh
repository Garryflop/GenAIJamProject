#!/bin/sh
# Сборка игры: части склеиваются в один index.html (код не минифицирован, его можно читать прямо в index.html)
cd "$(dirname "$0")/parts"
cat p0.html p1.js p1b.js p2.js p2b.js p3.js p3d.js p4.js p5.js p5b.js p6.js p7a.js p7b.js > ../../index.html

#!/bin/sh
# Bundles the game's code into one HTML file.
# Usage:  sh build-single.sh   ->  writes task-sorter-single.html
#
# NOT fully self-contained any more. The CSS, the JavaScript and every
# sprite drawn in code go inside; the thirteen pet sheets in assets/pets/
# are real PNGs and stay where they are, so the file needs that folder
# beside it. Nothing else does.
awk '
  /<link rel="stylesheet"/ {
    print "<style>";
    while ((getline line < "css/style.css") > 0) print line;
    close("css/style.css");
    print "</style>";
    next
  }
  /<script src="/ {
    match($0, /src="[^"]+"/);
    f = substr($0, RSTART+5, RLENGTH-6);
    print "<script>";
    while ((getline line < f) > 0) print line;
    close(f);
    print "</" "script>";
    next
  }
  { print }
' index.html > task-sorter-single.html
echo "built task-sorter-single.html (keep assets/ beside it)"

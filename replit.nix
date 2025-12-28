{ pkgs }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs-18_x
    chromium
    ffmpeg
    imagemagick
    libwebp
    python3
    wget
    git
  ];

  shellHook = ''
    export CHROME_PATH="${pkgs.chromium}/bin/chromium"
    export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib:$LD_LIBRARY_PATH"
    export PUPPETEER_EXECUTABLE_PATH="${pkgs.chromium}/bin/chromium"
    echo "✅ Environment ready for WhatsApp Bot"
  '';
}

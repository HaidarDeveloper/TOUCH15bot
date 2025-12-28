{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.chromium
    pkgs.ffmpeg
    pkgs.imagemagick
    pkgs.libwebp
    pkgs.python3
    pkgs.nodePackages.pm2
    pkgs.nodePackages.nodemon
    pkgs.wget
    pkgs.git
  ];
  
  env = {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.stdenv.cc.cc.lib
      pkgs.zlib
      pkgs.glib
    ];
    CHROME_PATH = "${pkgs.chromium}/bin/chromium";
  };
}

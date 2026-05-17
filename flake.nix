{
  description = "Iasevka Font Family.";
  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.default = pkgs.symlinkJoin {
          name = "iasevka";
          paths = builtins.attrValues self.packages.${system};
        };
        packages.iasevka = pkgs.stdenvNoCC.mkDerivation {
          name = "iasevka-font";
          src = pkgs.fetchzip {
            url = "https://github.com/stringptr/Iasevka/releases/download/v1.0/Iasevka-v1.0.zip";
            sha256 = "1r4bal9wm1i3c8i90r3v9bbm8hp0bbvg4ka0l9q3v7rzvlsqxkmk";
            stripRoot = true;
          };
          installPhase = ''
            mkdir -p $out/share/fonts/truetype
            cp -r $src/TTF/*.ttf $out/share/fonts/truetype/
          '';
          meta = {
            description = "Iasevka Font Family.";
          };
        };
      }
    );
}

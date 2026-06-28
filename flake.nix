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
            url = "https://github.com/stringptr/Iasevka/releases/download/v2.2/Iasevka-v2.2.zip";
            sha256 = "sha256-PFBK/njTnnuIPscWEkjUJTfo3oSHLy6ubhQ6PDlW81E=";
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

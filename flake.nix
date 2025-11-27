{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";

    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        # System libraries needed by Playwright browsers
        playwrightDeps = with pkgs; [
          glib
          nss
          nspr
          atk
          at-spi2-atk
          cups
          dbus
          expat
          libdrm
          libxkbcommon
          pango
          cairo
          alsa-lib
          mesa
          xorg.libX11
          xorg.libXcomposite
          xorg.libXdamage
          xorg.libXext
          xorg.libXfixes
          xorg.libXrandr
          xorg.libxcb
          gtk3
          systemd
        ];
      in
      {
        # Sets up the development shell for `nix develop`
        devShell = pkgs.mkShell {
          packages = [
            pkgs.nodejs_24
          ];

          LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath playwrightDeps;

          shellHook = ''
            if [ ! -d node_modules ]; then
              echo "First-time setup:"
              echo "  1. Run 'npm install' to install project dependencies"
              echo "  2. Run 'npx playwright install' to install browsers for e2e tests"
            fi
          '';
        };
      }
    );
}

# Based on the `node` template from https://github.com/the-nix-way/dev-templates
{
  description = "A Nix-flake-based Node.js development environment for the mortgage calculator";

  inputs.nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0.1"; # unstable Nixpkgs

  outputs =
    { self, ... }@inputs:

    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forEachSupportedSystem =
        f:
        inputs.nixpkgs.lib.genAttrs supportedSystems (
          system:
          f {
            inherit system;
            pkgs = import inputs.nixpkgs {
              inherit system;
              overlays = [ inputs.self.overlays.default ];
            };
          }
        );

      # `nix run` wrapper: installs deps on first run, then runs an npm script.
      npmApp = pkgs: name: script: {
        type = "app";
        program = "${
          pkgs.writeShellApplication {
            inherit name;
            runtimeInputs = [ pkgs.nodejs ];
            text = ''
              if [ ! -d node_modules ]; then npm ci; fi
              exec npm run ${script} -- "$@"
            '';
          }
        }/bin/${name}";
      };
    in
    {
      overlays.default = final: prev: {
        # Match the Node version used by the GitHub Actions deploy workflow.
        nodejs = prev.nodejs_22;
      };

      devShells = forEachSupportedSystem (
        { pkgs, system }:
        {
          default = pkgs.mkShellNoCC {
            packages = with pkgs; [
              nodejs
              self.formatter.${system}
            ];
          };
        }
      );

      apps = forEachSupportedSystem (
        { pkgs, ... }:
        {
          default = npmApp pkgs "mortgage-dev" "dev";
          dev = npmApp pkgs "mortgage-dev" "dev";
          preview = npmApp pkgs "mortgage-preview" "preview";
        }
      );

      formatter = forEachSupportedSystem ({ pkgs, ... }: pkgs.nixfmt);
    };
}

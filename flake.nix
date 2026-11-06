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

      # Resolved at evaluation time so the update check compares the lock this
      # shell was built from, rather than a flake.lock in whatever directory
      # `nix develop` happened to be invoked from.
      lockedNixpkgsRev = inputs.nixpkgs.rev or "";
      lockedNixpkgsModified = toString (inputs.nixpkgs.lastModified or 0);
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

            # Once a day, on entering the shell (nix develop or direnv), report
            # when FlakeHub has a newer nixpkgs than flake.lock pins. It only
            # notifies; run `nix flake update` yourself to take the update.
            shellHook = ''
              check_flake_updates() {
                local locked=${lockedNixpkgsRev}
                [ -n "$locked" ] || return 0

                local stamp="''${XDG_CACHE_HOME:-$HOME/.cache}/mortgage-calculator/flake-update-check"
                [ "$(cat "$stamp" 2>/dev/null)" = "$(${pkgs.coreutils}/bin/date +%F)" ] && return 0

                # curl, jq and GNU date are referenced by store path so they
                # stay off PATH (and `date -d` works on macOS too).
                local latest latestPublished
                # jq's fromdateiso8601 rejects fractional seconds. The publish
                # time is display-only, so a shape it can't parse blanks the
                # time rather than failing the revision lookup.
                read -r latest latestPublished < <(
                  ${pkgs.curl}/bin/curl -fs --max-time 10 https://api.flakehub.com/version/NixOS/nixpkgs/0.1 \
                    | ${pkgs.jq}/bin/jq -r '"\(.revision // empty) \(try (.published_at | sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601) catch "")"' 2>/dev/null
                )

                # Only a completed lookup consumes the daily slot, so an
                # offline or timed-out entry retries on the next one.
                [ -n "$latest" ] || return 0
                mkdir -p "$(dirname "$stamp")" && ${pkgs.coreutils}/bin/date +%F > "$stamp"

                if [ "$locked" != "$latest" ]; then
                  local fmt='\n%s\n\n'
                  if [ -t 2 ] && [ -z "''${NO_COLOR:-}" ]; then
                    fmt='\n\033[1;33m▲ %s\033[0m\n\n'
                  fi
                  local when='+%F %H:%M %Z'
                  local latestWhen=unknown
                  [ -z "$latestPublished" ] || latestWhen=$(${pkgs.coreutils}/bin/date -d "@$latestPublished" "$when")
                  printf "$fmt" "nixpkgs update available (pinned $(${pkgs.coreutils}/bin/date -d @${lockedNixpkgsModified} "$when"), latest $latestWhen) — run 'nix flake update'" >&2
                fi
              }
              check_flake_updates
              unset -f check_flake_updates
            '';
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

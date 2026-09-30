DOLT_VERSION=2.2.0   # see "Which Dolt version to install" below

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m | sed -e 's/^x86_64$/amd64/' -e 's/^aarch64$/arm64/')
curl -fsSL "https://github.com/dolthub/dolt/releases/download/v${DOLT_VERSION}/dolt-${os}-${arch}.tar.gz" \
  | tar -xz -C /tmp
sudo install -m 0755 "/tmp/dolt-${os}-${arch}/bin/dolt" /usr/local/bin/dolt

# Verify you got the version you asked for
dolt config --global --add versioncheck.disabled true
dolt version
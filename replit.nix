{pkgs}: {
  deps = [
    pkgs.docker-compose
    pkgs.docker
    pkgs.postgresql
    pkgs.openssl
  ];
}

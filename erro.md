root@sispat:~# curl -fsSL
https://raw.githubusercontent.com/junielsonfarias/sispat/main/scripts/install-vps-complete.sh -o
install-vps-complete.sh root@sispat:~# chmod +x install-vps-complete.sh root@sispat:~#
./install-vps-complete.sh

🚀 ================================================ 🚀 INSTALAÇÃO COMPLETA VPS - SISPAT 🚀 Sistema
de Patrimônio - VERSÃO CORRIGIDA FINAL 🚀 ================================================

[2025-09-01 12:11:18] 🔧 CORREÇÃO PRÉVIA - Removendo repositórios PostgreSQL problemáticos...
[2025-09-01 12:11:18] 📦 Atualizando sistema... Hit:1 http://br.archive.ubuntu.com/ubuntu focal
InRelease Hit:2 http://br.archive.ubuntu.com/ubuntu focal-updates InRelease Hit:3
http://br.archive.ubuntu.com/ubuntu focal-backports InRelease Hit:4
http://br.archive.ubuntu.com/ubuntu focal-security InRelease Reading package lists... Done Building
dependency tree Reading state information... Done 71 packages can be upgraded. Run 'apt list
--upgradable' to see them. Reading package lists... Done Building dependency tree Reading state
information... Done Calculating upgrade... Done The following security updates require Ubuntu Pro
with 'esm-infra' enabled: cloud-init linux-headers-generic libblockdev-swap2 libssh-4
libpython3.8-minimal git-man libsystemd0 gcc-10-base linux-image-generic libsqlite3-0
python3-urllib3 sudo libpython3.8 python3.8 git libblockdev-crypto2 udev libblockdev-loop2
libblockdev-fs2 libblockdev-part2 python3-requests libudev1 libsoup2.4-1 systemd-timesyncd libtiff5
udisks2 python3.8-minimal systemd-sysv libblockdev2 libpam-systemd systemd libblockdev-utils2
libnss-systemd libblockdev-part-err2 libgcc-s1 libxml2 libpython3.8-stdlib libudisks2-0 libstdc++6
linux-generic libxslt1.1 Learn more about Ubuntu Pro at https://ubuntu.com/pro The following NEW
packages will be installed: linux-headers-5.4.0-216 linux-headers-5.4.0-216-generic
linux-image-5.4.0-216-generic linux-modules-5.4.0-216-generic linux-modules-extra-5.4.0-216-generic
The following packages will be upgraded: apport apt apt-utils cloud-init cryptsetup cryptsetup-bin
cryptsetup-initramfs cryptsetup-run dirmngr distro-info-data gnupg gnupg-l10n gnupg-utils gpg
gpg-agent gpg-wks-client gpg-wks-server gpgconf gpgsm gpgv initramfs-tools initramfs-tools-bin
initramfs-tools-core intel-microcode krb5-locales libapt-pkg6.0 libarchive13 libc-bin libc6
libcryptsetup12 libfreetype6 libglib2.0-0 libglib2.0-bin libglib2.0-data libgssapi-krb5-2
libk5crypto3 libkrb5-3 libkrb5support0 libpython3.8 libpython3.8-minimal libpython3.8-stdlib
libsoup2.4-1 libsqlite3-0 libxml2 libxslt1.1 linux-generic linux-headers-generic linux-image-generic
locales open-vm-tools openssh-client openssh-server openssh-sftp-server python3-apport
python3-jinja2 python3-pkg-resources python3-problem-report python3-setuptools python3.8
python3.8-minimal snapd sosreport tzdata ubuntu-advantage-tools ubuntu-pro-client
ubuntu-pro-client-l10n vim vim-common vim-runtime vim-tiny xxd 71 upgraded, 5 newly installed, 0 to
remove and 0 not upgraded. 53 standard LTS security updates Need to get 149 MB of archives. After
this operation, 385 MB of additional disk space will be used. Get:1
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libc6 amd64 2.31-0ubuntu9.18 [2720 kB]
Get:2 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 locales all 2.31-0ubuntu9.18
[3864 kB] Get:3 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libc-bin amd64
2.31-0ubuntu9.18 [636 kB] Get:4 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libapt-pkg6.0 amd64 2.0.11 [843 kB] Get:5 http://br.archive.ubuntu.com/ubuntu focal-updates/main
amd64 apt amd64 2.0.11 [1280 kB] Get:6 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
apt-utils amd64 2.0.11 [213 kB] Get:7 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
gpg-wks-client amd64 2.2.19-3ubuntu2.5 [97.8 kB] Get:8 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 dirmngr amd64 2.2.19-3ubuntu2.5 [330 kB] Get:9
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 gpg-wks-server amd64 2.2.19-3ubuntu2.5
[90.0 kB] Get:10 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 gnupg-utils amd64
2.2.19-3ubuntu2.5 [481 kB] Get:11 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
gpg-agent amd64 2.2.19-3ubuntu2.5 [232 kB] Get:12 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 gpg amd64 2.2.19-3ubuntu2.5 [483 kB] Get:13
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 gpgconf amd64 2.2.19-3ubuntu2.5 [124
kB] Get:14 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 gnupg-l10n all
2.2.19-3ubuntu2.5 [51.9 kB] Get:15 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
gnupg all 2.2.19-3ubuntu2.5 [259 kB] Get:16 http://br.archive.ubuntu.com/ubuntu focal-updates/main
amd64 gpgsm amd64 2.2.19-3ubuntu2.5 [217 kB] Get:17 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libsqlite3-0 amd64 3.31.1-4ubuntu0.7 [549 kB] Get:18
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 gpgv amd64 2.2.19-3ubuntu2.5 [200 kB]
Get:19 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libpython3.8 amd64
3.8.10-0ubuntu1~20.04.18 [1625 kB] Get:20 http://br.archive.ubuntu.com/ubuntu focal-updates/main
amd64 python3.8 amd64 3.8.10-0ubuntu1~20.04.18 [387 kB] Get:21 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libpython3.8-stdlib amd64 3.8.10-0ubuntu1~20.04.18 [1676 kB] Get:22
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 python3.8-minimal amd64
3.8.10-0ubuntu1~20.04.18 [1900 kB] Get:23 http://br.archive.ubuntu.com/ubuntu focal-updates/main
amd64 libpython3.8-minimal amd64 3.8.10-0ubuntu1~20.04.18 [721 kB] Get:24
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libglib2.0-data all
2.64.6-1~ubuntu20.04.9 [5836 B] Get:25 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libglib2.0-bin amd64 2.64.6-1~ubuntu20.04.9 [72.9 kB] Get:26 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libglib2.0-0 amd64 2.64.6-1~ubuntu20.04.9 [1290 kB] Get:27
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libxml2 amd64
2.9.10+dfsg-5ubuntu0.20.04.10 [640 kB] Get:28 http://br.archive.ubuntu.com/ubuntu focal-updates/main
amd64 open-vm-tools amd64 2:11.3.0-2ubuntu0~ubuntu20.04.8 [649 kB] Get:29
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 distro-info-data all 0.43ubuntu1.18
[5020 B] Get:30 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libcryptsetup12 amd64
2:2.2.2-3ubuntu2.5 [166 kB] Get:31 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
python3-setuptools all 45.2.0-1ubuntu0.3 [330 kB] Get:32 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 python3-pkg-resources all 45.2.0-1ubuntu0.3 [130 kB] Get:33
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 tzdata all 2025b-0ubuntu0.20.04.1 [300
kB] Get:34 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 ubuntu-pro-client-l10n amd64
36ubuntu0~20.04 [18.7 kB] Get:35 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
ubuntu-pro-client amd64 36ubuntu0~20.04 [236 kB] Get:36 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 ubuntu-advantage-tools all 36ubuntu0~20.04 [11.0 kB] Get:37
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 vim amd64 2:8.1.2269-1ubuntu5.32 [1241
kB] Get:38 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 vim-tiny amd64
2:8.1.2269-1ubuntu5.32 [579 kB] Get:39 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
vim-runtime all 2:8.1.2269-1ubuntu5.32 [5876 kB] Get:40 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 xxd amd64 2:8.1.2269-1ubuntu5.32 [50.0 kB] Get:41
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 vim-common all 2:8.1.2269-1ubuntu5.32
[84.9 kB] Get:42 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 krb5-locales all
1.17-6ubuntu4.11 [12.0 kB] Get:43 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libgssapi-krb5-2 amd64 1.17-6ubuntu4.11 [121 kB] Get:44 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libkrb5-3 amd64 1.17-6ubuntu4.11 [330 kB] Get:45
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libkrb5support0 amd64 1.17-6ubuntu4.11
[31.5 kB] Get:46 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libk5crypto3 amd64
1.17-6ubuntu4.11 [80.3 kB] Get:47 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
openssh-sftp-server amd64 1:8.2p1-4ubuntu0.13 [51.6 kB] Get:48 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 openssh-server amd64 1:8.2p1-4ubuntu0.13 [378 kB] Get:49
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 openssh-client amd64
1:8.2p1-4ubuntu0.13 [670 kB] Get:50 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
python3-problem-report all 2.20.11-0ubuntu27.31 [10.9 kB] Get:51 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 python3-apport all 2.20.11-0ubuntu27.31 [87.0 kB] Get:52
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 apport all 2.20.11-0ubuntu27.31 [130
kB] Get:53 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 initramfs-tools all
0.136ubuntu6.8 [9212 B] Get:54 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
initramfs-tools-core all 0.136ubuntu6.8 [47.8 kB] Get:55 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 initramfs-tools-bin amd64 0.136ubuntu6.8 [11.0 kB] Get:56
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 cryptsetup-initramfs all
2:2.2.2-3ubuntu2.5 [26.1 kB] Get:57 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
cryptsetup-bin amd64 2:2.2.2-3ubuntu2.5 [119 kB] Get:58 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 cryptsetup amd64 2:2.2.2-3ubuntu2.5 [159 kB] Get:59
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 cryptsetup-run all 2:2.2.2-3ubuntu2.5
[6372 B] Get:60 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libarchive13 amd64
3.4.0-2ubuntu1.5 [327 kB] Get:61 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libfreetype6 amd64 2.10.1-2ubuntu0.4 [341 kB] Get:62 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libsoup2.4-1 amd64 2.70.0-1ubuntu0.5 [263 kB] Get:63
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libxslt1.1 amd64
1.1.34-4ubuntu0.20.04.3 [151 kB] Get:64 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
linux-modules-5.4.0-216-generic amd64 5.4.0-216.236 [15.0 MB] Get:65
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 linux-image-5.4.0-216-generic amd64
5.4.0-216.236 [10.5 MB] Get:66 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
linux-modules-extra-5.4.0-216-generic amd64 5.4.0-216.236 [39.2 MB] Get:67
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 intel-microcode amd64
3.20250512.0ubuntu0.20.04.1 [11.1 MB] Get:68 http://br.archive.ubuntu.com/ubuntu focal-updates/main
amd64 linux-generic amd64 5.4.0.216.208 [1896 B] Get:69 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 linux-image-generic amd64 5.4.0.216.208 [2472 B] Get:70
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 linux-headers-5.4.0-216 all
5.4.0-216.236 [11.0 MB] Get:71 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
linux-headers-5.4.0-216-generic amd64 5.4.0-216.236 [1362 kB] Get:72
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 linux-headers-generic amd64
5.4.0.216.208 [2340 B] Get:73 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
python3-jinja2 all 2.10.1-2ubuntu0.6 [96.3 kB] Get:74 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 snapd amd64 2.67.1+20.04 [26.1 MB] Get:75
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 sosreport amd64 4.8.2-0ubuntu0~20.04.1
[357 kB] Get:76 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 cloud-init all
24.4.1-0ubuntu0~20.04.3 [569 kB] Fetched 149 MB in 3s (46.0 MB/s) Extracting templates from
packages: 100% Preconfiguring packages ... (Reading database ... 109091 files and directories
currently installed.) Preparing to unpack .../libc6_2.31-0ubuntu9.18_amd64.deb ... Unpacking
libc6:amd64 (2.31-0ubuntu9.18) over (2.31-0ubuntu9.17) ... Setting up libc6:amd64 (2.31-0ubuntu9.18)
... (Reading database ... 109091 files and directories currently installed.) Preparing to unpack
.../locales_2.31-0ubuntu9.18_all.deb ... Unpacking locales (2.31-0ubuntu9.18) over
(2.31-0ubuntu9.17) ... Preparing to unpack .../libc-bin_2.31-0ubuntu9.18_amd64.deb ... Unpacking
libc-bin (2.31-0ubuntu9.18) over (2.31-0ubuntu9.17) ... Setting up libc-bin (2.31-0ubuntu9.18) ...
(Reading database ... 109091 files and directories currently installed.) Preparing to unpack
.../libapt-pkg6.0_2.0.11_amd64.deb ... Unpacking libapt-pkg6.0:amd64 (2.0.11) over (2.0.10) ...
Setting up libapt-pkg6.0:amd64 (2.0.11) ... (Reading database ... 109091 files and directories
currently installed.) Preparing to unpack .../archives/apt_2.0.11_amd64.deb ... Unpacking apt
(2.0.11) over (2.0.10) ... Setting up apt (2.0.11) ... (Reading database ... 109091 files and
directories currently installed.) Preparing to unpack .../00-apt-utils_2.0.11_amd64.deb ...
Unpacking apt-utils (2.0.11) over (2.0.10) ... Preparing to unpack
.../01-gpg-wks-client_2.2.19-3ubuntu2.5_amd64.deb ... Unpacking gpg-wks-client (2.2.19-3ubuntu2.5)
over (2.2.19-3ubuntu2.2) ... Preparing to unpack .../02-dirmngr_2.2.19-3ubuntu2.5_amd64.deb ...
Unpacking dirmngr (2.2.19-3ubuntu2.5) over (2.2.19-3ubuntu2.2) ... Preparing to unpack
.../03-gpg-wks-server_2.2.19-3ubuntu2.5_amd64.deb ... Unpacking gpg-wks-server (2.2.19-3ubuntu2.5)
over (2.2.19-3ubuntu2.2) ... Preparing to unpack .../04-gnupg-utils_2.2.19-3ubuntu2.5_amd64.deb ...
Unpacking gnupg-utils (2.2.19-3ubuntu2.5) over (2.2.19-3ubuntu2.2) ... Preparing to unpack
.../05-gpg-agent_2.2.19-3ubuntu2.5_amd64.deb ... Unpacking gpg-agent (2.2.19-3ubuntu2.5) over
(2.2.19-3ubuntu2.2) ... Preparing to unpack .../06-gpg_2.2.19-3ubuntu2.5_amd64.deb ... Unpacking gpg
(2.2.19-3ubuntu2.5) over (2.2.19-3ubuntu2.2) ... Preparing to unpack
.../07-gpgconf_2.2.19-3ubuntu2.5_amd64.deb ... Unpacking gpgconf (2.2.19-3ubuntu2.5) over
(2.2.19-3ubuntu2.2) ... Preparing to unpack .../08-gnupg-l10n_2.2.19-3ubuntu2.5_all.deb ...
Unpacking gnupg-l10n (2.2.19-3ubuntu2.5) over (2.2.19-3ubuntu2.2) ... Preparing to unpack
.../09-gnupg_2.2.19-3ubuntu2.5_all.deb ... Unpacking gnupg (2.2.19-3ubuntu2.5) over
(2.2.19-3ubuntu2.2) ... Preparing to unpack .../10-gpgsm_2.2.19-3ubuntu2.5_amd64.deb ... Unpacking
gpgsm (2.2.19-3ubuntu2.5) over (2.2.19-3ubuntu2.2) ... Preparing to unpack
.../11-libsqlite3-0_3.31.1-4ubuntu0.7_amd64.deb ... Unpacking libsqlite3-0:amd64 (3.31.1-4ubuntu0.7)
over (3.31.1-4ubuntu0.6) ... Preparing to unpack .../12-gpgv_2.2.19-3ubuntu2.5_amd64.deb ...
Unpacking gpgv (2.2.19-3ubuntu2.5) over (2.2.19-3ubuntu2.2) ... Setting up gpgv (2.2.19-3ubuntu2.5)
... (Reading database ... 109091 files and directories currently installed.) Preparing to unpack
.../00-libpython3.8_3.8.10-0ubuntu1~20.04.18_amd64.deb ... Unpacking libpython3.8:amd64
(3.8.10-0ubuntu1~20.04.18) over (3.8.10-0ubuntu1~20.04.15) ... Preparing to unpack
.../01-python3.8_3.8.10-0ubuntu1~20.04.18_amd64.deb ... Unpacking python3.8
(3.8.10-0ubuntu1~20.04.18) over (3.8.10-0ubuntu1~20.04.15) ... Preparing to unpack
.../02-libpython3.8-stdlib_3.8.10-0ubuntu1~20.04.18_amd64.deb ... Unpacking
libpython3.8-stdlib:amd64 (3.8.10-0ubuntu1~20.04.18) over (3.8.10-0ubuntu1~20.04.15) ... Preparing
to unpack .../03-python3.8-minimal_3.8.10-0ubuntu1~20.04.18_amd64.deb ... Unpacking
python3.8-minimal (3.8.10-0ubuntu1~20.04.18) over (3.8.10-0ubuntu1~20.04.15) ... Preparing to unpack
.../04-libpython3.8-minimal_3.8.10-0ubuntu1~20.04.18_amd64.deb ... Unpacking
libpython3.8-minimal:amd64 (3.8.10-0ubuntu1~20.04.18) over (3.8.10-0ubuntu1~20.04.15) ... Preparing
to unpack .../05-libglib2.0-data_2.64.6-1~ubuntu20.04.9_all.deb ... Unpacking libglib2.0-data
(2.64.6-1~ubuntu20.04.9) over (2.64.6-1~ubuntu20.04.8) ... Preparing to unpack
.../06-libglib2.0-bin_2.64.6-1~ubuntu20.04.9_amd64.deb ... Unpacking libglib2.0-bin
(2.64.6-1~ubuntu20.04.9) over (2.64.6-1~ubuntu20.04.8) ... Preparing to unpack
.../07-libglib2.0-0_2.64.6-1~ubuntu20.04.9_amd64.deb ... Unpacking libglib2.0-0:amd64
(2.64.6-1~ubuntu20.04.9) over (2.64.6-1~ubuntu20.04.8) ... Preparing to unpack
.../08-libxml2_2.9.10+dfsg-5ubuntu0.20.04.10_amd64.deb ... Unpacking libxml2:amd64
(2.9.10+dfsg-5ubuntu0.20.04.10) over (2.9.10+dfsg-5ubuntu0.20.04.9) ... Preparing to unpack
.../09-open-vm-tools_2%3a11.3.0-2ubuntu0~ubuntu20.04.8_amd64.deb ... Unpacking open-vm-tools
(2:11.3.0-2ubuntu0~ubuntu20.04.8) over (2:11.3.0-2ubuntu0~ubuntu20.04.7) ... Preparing to unpack
.../10-distro-info-data_0.43ubuntu1.18_all.deb ... Unpacking distro-info-data (0.43ubuntu1.18) over
(0.43ubuntu1.17) ... Preparing to unpack .../11-libcryptsetup12_2%3a2.2.2-3ubuntu2.5_amd64.deb ...
Unpacking libcryptsetup12:amd64 (2:2.2.2-3ubuntu2.5) over (2:2.2.2-3ubuntu2.4) ... Preparing to
unpack .../12-python3-setuptools_45.2.0-1ubuntu0.3_all.deb ... Unpacking python3-setuptools
(45.2.0-1ubuntu0.3) over (45.2.0-1ubuntu0.2) ... Preparing to unpack
.../13-python3-pkg-resources_45.2.0-1ubuntu0.3_all.deb ... Unpacking python3-pkg-resources
(45.2.0-1ubuntu0.3) over (45.2.0-1ubuntu0.2) ... Preparing to unpack
.../14-tzdata_2025b-0ubuntu0.20.04.1_all.deb ... Unpacking tzdata (2025b-0ubuntu0.20.04.1) over
(2024b-0ubuntu0.20.04.1) ... Preparing to unpack
.../15-ubuntu-pro-client-l10n_36ubuntu0~20.04_amd64.deb ... Unpacking ubuntu-pro-client-l10n
(36ubuntu0~20.04) over (34~20.04) ... Preparing to unpack
.../16-ubuntu-pro-client_36ubuntu0~20.04_amd64.deb ... Unpacking ubuntu-pro-client (36ubuntu0~20.04)
over (34~20.04) ... Preparing to unpack .../17-ubuntu-advantage-tools_36ubuntu0~20.04_all.deb ...
Unpacking ubuntu-advantage-tools (36ubuntu0~20.04) over (34~20.04) ... Preparing to unpack
.../18-vim_2%3a8.1.2269-1ubuntu5.32_amd64.deb ... Unpacking vim (2:8.1.2269-1ubuntu5.32) over
(2:8.1.2269-1ubuntu5.31) ... Preparing to unpack .../19-vim-tiny_2%3a8.1.2269-1ubuntu5.32_amd64.deb
... Unpacking vim-tiny (2:8.1.2269-1ubuntu5.32) over (2:8.1.2269-1ubuntu5.31) ... Preparing to
unpack .../20-vim-runtime_2%3a8.1.2269-1ubuntu5.32_all.deb ... Unpacking vim-runtime
(2:8.1.2269-1ubuntu5.32) over (2:8.1.2269-1ubuntu5.31) ... Preparing to unpack
.../21-xxd_2%3a8.1.2269-1ubuntu5.32_amd64.deb ... Unpacking xxd (2:8.1.2269-1ubuntu5.32) over
(2:8.1.2269-1ubuntu5.31) ... Preparing to unpack .../22-vim-common_2%3a8.1.2269-1ubuntu5.32_all.deb
... Unpacking vim-common (2:8.1.2269-1ubuntu5.32) over (2:8.1.2269-1ubuntu5.31) ... Preparing to
unpack .../23-krb5-locales_1.17-6ubuntu4.11_all.deb ... Unpacking krb5-locales (1.17-6ubuntu4.11)
over (1.17-6ubuntu4.9) ... Preparing to unpack .../24-libgssapi-krb5-2_1.17-6ubuntu4.11_amd64.deb
... Unpacking libgssapi-krb5-2:amd64 (1.17-6ubuntu4.11) over (1.17-6ubuntu4.9) ... Preparing to
unpack .../25-libkrb5-3_1.17-6ubuntu4.11_amd64.deb ... Unpacking libkrb5-3:amd64 (1.17-6ubuntu4.11)
over (1.17-6ubuntu4.9) ... Preparing to unpack .../26-libkrb5support0_1.17-6ubuntu4.11_amd64.deb ...
Unpacking libkrb5support0:amd64 (1.17-6ubuntu4.11) over (1.17-6ubuntu4.9) ... Preparing to unpack
.../27-libk5crypto3_1.17-6ubuntu4.11_amd64.deb ... Unpacking libk5crypto3:amd64 (1.17-6ubuntu4.11)
over (1.17-6ubuntu4.9) ... Preparing to unpack
.../28-openssh-sftp-server_1%3a8.2p1-4ubuntu0.13_amd64.deb ... Unpacking openssh-sftp-server
(1:8.2p1-4ubuntu0.13) over (1:8.2p1-4ubuntu0.12) ... Preparing to unpack
.../29-openssh-server_1%3a8.2p1-4ubuntu0.13_amd64.deb ... Unpacking openssh-server
(1:8.2p1-4ubuntu0.13) over (1:8.2p1-4ubuntu0.12) ... Preparing to unpack
.../30-openssh-client_1%3a8.2p1-4ubuntu0.13_amd64.deb ... Unpacking openssh-client
(1:8.2p1-4ubuntu0.13) over (1:8.2p1-4ubuntu0.12) ... Preparing to unpack
.../31-python3-problem-report_2.20.11-0ubuntu27.31_all.deb ... Unpacking python3-problem-report
(2.20.11-0ubuntu27.31) over (2.20.11-0ubuntu27.27) ... Preparing to unpack
.../32-python3-apport_2.20.11-0ubuntu27.31_all.deb ... Unpacking python3-apport
(2.20.11-0ubuntu27.31) over (2.20.11-0ubuntu27.27) ... Preparing to unpack
.../33-apport_2.20.11-0ubuntu27.31_all.deb ... Unpacking apport (2.20.11-0ubuntu27.31) over
(2.20.11-0ubuntu27.27) ... Preparing to unpack .../34-initramfs-tools_0.136ubuntu6.8_all.deb ...
Unpacking initramfs-tools (0.136ubuntu6.8) over (0.136ubuntu6.7) ... Preparing to unpack
.../35-initramfs-tools-core_0.136ubuntu6.8_all.deb ... Unpacking initramfs-tools-core
(0.136ubuntu6.8) over (0.136ubuntu6.7) ... Preparing to unpack
.../36-initramfs-tools-bin_0.136ubuntu6.8_amd64.deb ... Unpacking initramfs-tools-bin
(0.136ubuntu6.8) over (0.136ubuntu6.7) ... Preparing to unpack
.../37-cryptsetup-initramfs_2%3a2.2.2-3ubuntu2.5_all.deb ... Unpacking cryptsetup-initramfs
(2:2.2.2-3ubuntu2.5) over (2:2.2.2-3ubuntu2.4) ... Preparing to unpack
.../38-cryptsetup-bin_2%3a2.2.2-3ubuntu2.5_amd64.deb ... Unpacking cryptsetup-bin
(2:2.2.2-3ubuntu2.5) over (2:2.2.2-3ubuntu2.4) ... Preparing to unpack
.../39-cryptsetup_2%3a2.2.2-3ubuntu2.5_amd64.deb ... Unpacking cryptsetup (2:2.2.2-3ubuntu2.5) over
(2:2.2.2-3ubuntu2.4) ... Preparing to unpack .../40-cryptsetup-run_2%3a2.2.2-3ubuntu2.5_all.deb ...
Unpacking cryptsetup-run (2:2.2.2-3ubuntu2.5) over (2:2.2.2-3ubuntu2.4) ... Preparing to unpack
.../41-libarchive13_3.4.0-2ubuntu1.5_amd64.deb ... Unpacking libarchive13:amd64 (3.4.0-2ubuntu1.5)
over (3.4.0-2ubuntu1.4) ... Preparing to unpack .../42-libfreetype6_2.10.1-2ubuntu0.4_amd64.deb ...
Unpacking libfreetype6:amd64 (2.10.1-2ubuntu0.4) over (2.10.1-2ubuntu0.3) ... Preparing to unpack
.../43-libsoup2.4-1_2.70.0-1ubuntu0.5_amd64.deb ... Unpacking libsoup2.4-1:amd64 (2.70.0-1ubuntu0.5)
over (2.70.0-1ubuntu0.1) ... Preparing to unpack .../44-libxslt1.1_1.1.34-4ubuntu0.20.04.3_amd64.deb
... Unpacking libxslt1.1:amd64 (1.1.34-4ubuntu0.20.04.3) over (1.1.34-4ubuntu0.20.04.1) ...
Selecting previously unselected package linux-modules-5.4.0-216-generic. Preparing to unpack
.../45-linux-modules-5.4.0-216-generic_5.4.0-216.236_amd64.deb ... Unpacking
linux-modules-5.4.0-216-generic (5.4.0-216.236) ... Selecting previously unselected package
linux-image-5.4.0-216-generic. Preparing to unpack
.../46-linux-image-5.4.0-216-generic_5.4.0-216.236_amd64.deb ... Unpacking
linux-image-5.4.0-216-generic (5.4.0-216.236) ... Selecting previously unselected package
linux-modules-extra-5.4.0-216-generic. Preparing to unpack
.../47-linux-modules-extra-5.4.0-216-generic_5.4.0-216.236_amd64.deb ... Unpacking
linux-modules-extra-5.4.0-216-generic (5.4.0-216.236) ... Preparing to unpack
.../48-intel-microcode_3.20250512.0ubuntu0.20.04.1_amd64.deb ... Unpacking intel-microcode
(3.20250512.0ubuntu0.20.04.1) over (3.20250211.0ubuntu0.20.04.1) ... Preparing to unpack
.../49-linux-generic_5.4.0.216.208_amd64.deb ... Unpacking linux-generic (5.4.0.216.208) over
(5.4.0.208.204) ... Preparing to unpack .../50-linux-image-generic_5.4.0.216.208_amd64.deb ...
Unpacking linux-image-generic (5.4.0.216.208) over (5.4.0.208.204) ... Selecting previously
unselected package linux-headers-5.4.0-216. Preparing to unpack
.../51-linux-headers-5.4.0-216_5.4.0-216.236_all.deb ... Unpacking linux-headers-5.4.0-216
(5.4.0-216.236) ... Selecting previously unselected package linux-headers-5.4.0-216-generic.
Preparing to unpack .../52-linux-headers-5.4.0-216-generic_5.4.0-216.236_amd64.deb ... Unpacking
linux-headers-5.4.0-216-generic (5.4.0-216.236) ... Preparing to unpack
.../53-linux-headers-generic_5.4.0.216.208_amd64.deb ... Unpacking linux-headers-generic
(5.4.0.216.208) over (5.4.0.208.204) ... Preparing to unpack
.../54-python3-jinja2_2.10.1-2ubuntu0.6_all.deb ... Unpacking python3-jinja2 (2.10.1-2ubuntu0.6)
over (2.10.1-2ubuntu0.4) ... Preparing to unpack .../55-snapd_2.67.1+20.04_amd64.deb ... Unpacking
snapd (2.67.1+20.04) over (2.66.1+20.04) ... Preparing to unpack
.../56-sosreport_4.8.2-0ubuntu0~20.04.1_amd64.deb ... Unpacking sosreport (4.8.2-0ubuntu0~20.04.1)
over (4.7.2-0ubuntu1~20.04.2) ... Preparing to unpack
.../57-cloud-init_24.4.1-0ubuntu0~20.04.3_all.deb ... Unpacking cloud-init (24.4.1-0ubuntu0~20.04.3)
over (24.4.1-0ubuntu0~20.04.1) ... Setting up python3-pkg-resources (45.2.0-1ubuntu0.3) ... Setting
up linux-headers-5.4.0-216 (5.4.0-216.236) ... Setting up libpython3.8-minimal:amd64
(3.8.10-0ubuntu1~20.04.18) ... Setting up apt-utils (2.0.11) ... Setting up python3-setuptools
(45.2.0-1ubuntu0.3) ... Setting up linux-headers-5.4.0-216-generic (5.4.0-216.236) ... Setting up
python3-problem-report (2.20.11-0ubuntu27.31) ... Setting up libglib2.0-0:amd64
(2.64.6-1~ubuntu20.04.9) ... Setting up distro-info-data (0.43ubuntu1.18) ... Setting up
intel-microcode (3.20250512.0ubuntu0.20.04.1) ... update-initramfs: deferring update (trigger
activated) intel-microcode: microcode will be updated at next boot Setting up libsqlite3-0:amd64
(3.31.1-4ubuntu0.7) ... Setting up krb5-locales (1.17-6ubuntu4.11) ... Setting up
linux-headers-generic (5.4.0.216.208) ... Setting up locales (2.31-0ubuntu9.18) ... Generating
locales (this might take a while)... en_US.UTF-8... done Generation complete. Setting up xxd
(2:8.1.2269-1ubuntu5.32) ... Setting up python3-apport (2.20.11-0ubuntu27.31) ... Setting up
linux-modules-5.4.0-216-generic (5.4.0-216.236) ... Setting up libkrb5support0:amd64
(1.17-6ubuntu4.11) ... Setting up tzdata (2025b-0ubuntu0.20.04.1) ...

Current default time zone: 'America/Sao_Paulo' Local time is now: Mon Sep 1 12:12:41 -03 2025.
Universal Time is now: Mon Sep 1 15:12:41 UTC 2025. Run 'dpkg-reconfigure tzdata' if you wish to
change it.

Setting up python3-jinja2 (2.10.1-2ubuntu0.6) ... Setting up libglib2.0-data
(2.64.6-1~ubuntu20.04.9) ... Setting up vim-common (2:8.1.2269-1ubuntu5.32) ... Setting up
libfreetype6:amd64 (2.10.1-2ubuntu0.4) ... Setting up gnupg-l10n (2.2.19-3ubuntu2.5) ... Setting up
libk5crypto3:amd64 (1.17-6ubuntu4.11) ... Setting up sosreport (4.8.2-0ubuntu0~20.04.1) ... Setting
up python3.8-minimal (3.8.10-0ubuntu1~20.04.18) ... Setting up gpgconf (2.2.19-3ubuntu2.5) ...
Setting up libcryptsetup12:amd64 (2:2.2.2-3ubuntu2.5) ... Setting up libkrb5-3:amd64
(1.17-6ubuntu4.11) ... Setting up vim-runtime (2:8.1.2269-1ubuntu5.32) ... Setting up
libpython3.8-stdlib:amd64 (3.8.10-0ubuntu1~20.04.18) ... Setting up python3.8
(3.8.10-0ubuntu1~20.04.18) ... Setting up libxml2:amd64 (2.9.10+dfsg-5ubuntu0.20.04.10) ... Setting
up ubuntu-pro-client (36ubuntu0~20.04) ... Installing new version of config file
/etc/apparmor.d/ubuntu_pro_apt_news ... Installing new version of config file
/etc/apparmor.d/ubuntu_pro_esm_cache ... Installing new version of config file
/etc/apt/apt.conf.d/20apt-esm-hook.conf ... Setting up gpg (2.2.19-3ubuntu2.5) ... Setting up
linux-image-5.4.0-216-generic (5.4.0-216.236) ... I: /boot/vmlinuz.old is now a symlink to
vmlinuz-5.4.0-208-generic I: /boot/initrd.img.old is now a symlink to initrd.img-5.4.0-208-generic
I: /boot/vmlinuz is now a symlink to vmlinuz-5.4.0-216-generic I: /boot/initrd.img is now a symlink
to initrd.img-5.4.0-216-generic Setting up gnupg-utils (2.2.19-3ubuntu2.5) ... Setting up
initramfs-tools-bin (0.136ubuntu6.8) ... Setting up cryptsetup-bin (2:2.2.2-3ubuntu2.5) ... Setting
up ubuntu-pro-client-l10n (36ubuntu0~20.04) ... Setting up cloud-init (24.4.1-0ubuntu0~20.04.3) ...
Setting up gpg-agent (2.2.19-3ubuntu2.5) ... Setting up cryptsetup (2:2.2.2-3ubuntu2.5) ... Setting
up libarchive13:amd64 (3.4.0-2ubuntu1.5) ... Setting up gpgsm (2.2.19-3ubuntu2.5) ... Setting up
libglib2.0-bin (2.64.6-1~ubuntu20.04.9) ... Setting up vim-tiny (2:8.1.2269-1ubuntu5.32) ... Setting
up apport (2.20.11-0ubuntu27.31) ... Installing new version of config file /etc/init.d/apport ...
apport-autoreport.service is a disabled or a static unit, not starting it. Setting up dirmngr
(2.2.19-3ubuntu2.5) ... Setting up cryptsetup-run (2:2.2.2-3ubuntu2.5) ... Setting up
linux-modules-extra-5.4.0-216-generic (5.4.0-216.236) ... Setting up libpython3.8:amd64
(3.8.10-0ubuntu1~20.04.18) ... Setting up libgssapi-krb5-2:amd64 (1.17-6ubuntu4.11) ... Setting up
gpg-wks-server (2.2.19-3ubuntu2.5) ... Setting up open-vm-tools (2:11.3.0-2ubuntu0~ubuntu20.04.8)
... Setting up libxslt1.1:amd64 (1.1.34-4ubuntu0.20.04.3) ... Setting up ubuntu-advantage-tools
(36ubuntu0~20.04) ... Setting up initramfs-tools-core (0.136ubuntu6.8) ... Setting up
linux-image-generic (5.4.0.216.208) ... Setting up vim (2:8.1.2269-1ubuntu5.32) ... Setting up
libsoup2.4-1:amd64 (2.70.0-1ubuntu0.5) ... Setting up initramfs-tools (0.136ubuntu6.8) ...
update-initramfs: deferring update (trigger activated) Setting up gpg-wks-client (2.2.19-3ubuntu2.5)
... Setting up linux-generic (5.4.0.216.208) ... Setting up openssh-client (1:8.2p1-4ubuntu0.13) ...
Setting up gnupg (2.2.19-3ubuntu2.5) ... Setting up cryptsetup-initramfs (2:2.2.2-3ubuntu2.5) ...
update-initramfs: deferring update (trigger activated) update-initramfs: deferring update (trigger
activated) Setting up snapd (2.67.1+20.04) ... snapd.failure.service is a disabled or a static unit
not running, not starting it. snapd.snap-repair.service is a disabled or a static unit not running,
not starting it. Setting up openssh-sftp-server (1:8.2p1-4ubuntu0.13) ... Setting up openssh-server
(1:8.2p1-4ubuntu0.13) ... rescue-ssh.target is a disabled or a static unit, not starting it.
Processing triggers for rsyslog (8.2001.0-1ubuntu1.3) ... Processing triggers for ufw
(0.36-6ubuntu1.1) ... Processing triggers for systemd (245.4-4ubuntu3.24) ... Processing triggers
for man-db (2.9.1-1) ... Processing triggers for dbus (1.12.16-2ubuntu2.3) ... Processing triggers
for install-info (6.7.0.dfsg.2-5) ... Processing triggers for mime-support (3.64ubuntu1) ...
Processing triggers for libc-bin (2.31-0ubuntu9.18) ... Processing triggers for
linux-image-5.4.0-216-generic (5.4.0-216.236) ... /etc/kernel/postinst.d/initramfs-tools:
update-initramfs: Generating /boot/initrd.img-5.4.0-216-generic
/etc/kernel/postinst.d/zz-update-grub: Sourcing file
`/etc/default/grub' Sourcing file `/etc/default/grub.d/init-select.cfg' Generating grub
configuration file ... Found linux image: /boot/vmlinuz-5.4.0-216-generic Found initrd image:
/boot/initrd.img-5.4.0-216-generic Found linux image: /boot/vmlinuz-5.4.0-208-generic Found initrd
image: /boot/initrd.img-5.4.0-208-generic Found linux image: /boot/vmlinuz-5.4.0-200-generic Found
initrd image: /boot/initrd.img-5.4.0-200-generic done Processing triggers for initramfs-tools
(0.136ubuntu6.8) ... update-initramfs: Generating /boot/initrd.img-5.4.0-216-generic Reading package
lists... Done Building dependency tree Reading state information... Done curl is already the newest
version (7.68.0-1ubuntu2.25). curl set to manually installed. git is already the newest version
(1:2.25.1-1ubuntu3.14). git set to manually installed. software-properties-common is already the
newest version (0.99.9.12). software-properties-common set to manually installed. wget is already
the newest version (1.20.3-1ubuntu2.1). wget set to manually installed. The following packages were
automatically installed and are no longer required: linux-headers-5.4.0-200
linux-headers-5.4.0-200-generic linux-image-5.4.0-200-generic linux-modules-5.4.0-200-generic
linux-modules-extra-5.4.0-200-generic Use 'apt autoremove' to remove them. The following additional
packages will be installed: binutils binutils-common binutils-x86-64-linux-gnu cpp cpp-9 dpkg-dev
fakeroot g++ g++-9 gcc gcc-9 gcc-9-base libalgorithm-diff-perl libalgorithm-diff-xs-perl
libalgorithm-merge-perl libasan5 libatomic1 libbinutils libc-dev-bin libc6-dev libcc1-0 libcrypt-dev
libctf-nobfd0 libctf0 libdpkg-perl libfakeroot libfile-fcntllock-perl libgcc-9-dev libgomp1 libisl22
libitm1 liblsan0 libmpc3 libquadmath0 libstdc++-9-dev libtsan0 libubsan1 linux-libc-dev make
manpages-dev Suggested packages: binutils-doc cpp-doc gcc-9-locales debian-keyring g++-multilib
g++-9-multilib gcc-9-doc gcc-multilib autoconf automake libtool flex bison gdb gcc-doc
gcc-9-multilib glibc-doc bzr libstdc++-9-doc make-doc zip The following NEW packages will be
installed: binutils binutils-common binutils-x86-64-linux-gnu build-essential cpp cpp-9 dpkg-dev
fakeroot g++ g++-9 gcc gcc-9 gcc-9-base libalgorithm-diff-perl libalgorithm-diff-xs-perl
libalgorithm-merge-perl libasan5 libatomic1 libbinutils libc-dev-bin libc6-dev libcc1-0 libcrypt-dev
libctf-nobfd0 libctf0 libdpkg-perl libfakeroot libfile-fcntllock-perl libgcc-9-dev libgomp1 libisl22
libitm1 liblsan0 libmpc3 libquadmath0 libstdc++-9-dev libtsan0 libubsan1 linux-libc-dev make
manpages-dev unzip 0 upgraded, 42 newly installed, 0 to remove and 0 not upgraded. Need to get 45.6
MB of archives. After this operation, 203 MB of additional disk space will be used. Get:1
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 binutils-common amd64 2.34-6ubuntu1.11
[208 kB] Get:2 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libbinutils amd64
2.34-6ubuntu1.11 [475 kB] Get:3 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libctf-nobfd0 amd64 2.34-6ubuntu1.11 [48.2 kB] Get:4 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libctf0 amd64 2.34-6ubuntu1.11 [46.6 kB] Get:5
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 binutils-x86-64-linux-gnu amd64
2.34-6ubuntu1.11 [1612 kB] Get:6 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
binutils amd64 2.34-6ubuntu1.11 [3380 B] Get:7 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libc-dev-bin amd64 2.31-0ubuntu9.18 [71.7 kB] Get:8
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 linux-libc-dev amd64 5.4.0-216.236
[1111 kB] Get:9 http://br.archive.ubuntu.com/ubuntu focal/main amd64 libcrypt-dev amd64
1:4.4.10-10ubuntu4 [104 kB] Get:10 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libc6-dev amd64 2.31-0ubuntu9.18 [2520 kB] Get:11 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 gcc-9-base amd64 9.4.0-1ubuntu1~20.04.2 [18.9 kB] Get:12
http://br.archive.ubuntu.com/ubuntu focal/main amd64 libisl22 amd64 0.22.1-1 [592 kB] Get:13
http://br.archive.ubuntu.com/ubuntu focal/main amd64 libmpc3 amd64 1.1.0-1 [40.8 kB] Get:14
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 cpp-9 amd64 9.4.0-1ubuntu1~20.04.2
[7502 kB] Get:15 http://br.archive.ubuntu.com/ubuntu focal/main amd64 cpp amd64 4:9.3.0-1ubuntu2
[27.6 kB] Get:16 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libcc1-0 amd64
10.5.0-1ubuntu1~20.04 [48.8 kB] Get:17 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libgomp1 amd64 10.5.0-1ubuntu1~20.04 [102 kB] Get:18 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libitm1 amd64 10.5.0-1ubuntu1~20.04 [26.2 kB] Get:19
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libatomic1 amd64 10.5.0-1ubuntu1~20.04
[9284 B] Get:20 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libasan5 amd64
9.4.0-1ubuntu1~20.04.2 [2752 kB] Get:21 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
liblsan0 amd64 10.5.0-1ubuntu1~20.04 [835 kB] Get:22 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libtsan0 amd64 10.5.0-1ubuntu1~20.04 [2016 kB] Get:23
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libubsan1 amd64 10.5.0-1ubuntu1~20.04
[785 kB] Get:24 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libquadmath0 amd64
10.5.0-1ubuntu1~20.04 [146 kB] Get:25 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libgcc-9-dev amd64 9.4.0-1ubuntu1~20.04.2 [2359 kB] Get:26 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 gcc-9 amd64 9.4.0-1ubuntu1~20.04.2 [8276 kB] Get:27
http://br.archive.ubuntu.com/ubuntu focal/main amd64 gcc amd64 4:9.3.0-1ubuntu2 [5208 B] Get:28
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libstdc++-9-dev amd64
9.4.0-1ubuntu1~20.04.2 [1722 kB] Get:29 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
g++-9 amd64 9.4.0-1ubuntu1~20.04.2 [8421 kB] Get:30 http://br.archive.ubuntu.com/ubuntu focal/main
amd64 g++ amd64 4:9.3.0-1ubuntu2 [1604 B] Get:31 http://br.archive.ubuntu.com/ubuntu focal/main
amd64 make amd64 4.2.1-1.2 [162 kB] Get:32 http://br.archive.ubuntu.com/ubuntu focal-updates/main
amd64 libdpkg-perl all 1.19.7ubuntu3.2 [231 kB] Get:33 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 dpkg-dev all 1.19.7ubuntu3.2 [679 kB] Get:34
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 build-essential amd64 12.8ubuntu1.1
[4664 B] Get:35 http://br.archive.ubuntu.com/ubuntu focal/main amd64 libfakeroot amd64 1.24-1 [25.7
kB] Get:36 http://br.archive.ubuntu.com/ubuntu focal/main amd64 fakeroot amd64 1.24-1 [62.6 kB]
Get:37 http://br.archive.ubuntu.com/ubuntu focal/main amd64 libalgorithm-diff-perl all 1.19.03-2
[46.6 kB] Get:38 http://br.archive.ubuntu.com/ubuntu focal/main amd64 libalgorithm-diff-xs-perl
amd64 0.04-6 [11.3 kB] Get:39 http://br.archive.ubuntu.com/ubuntu focal/main amd64
libalgorithm-merge-perl all 0.08-3 [12.0 kB] Get:40 http://br.archive.ubuntu.com/ubuntu focal/main
amd64 libfile-fcntllock-perl amd64 0.22-3build4 [33.1 kB] Get:41 http://br.archive.ubuntu.com/ubuntu
focal/main amd64 manpages-dev all 5.05-1 [2266 kB] Get:42 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 unzip amd64 6.0-25ubuntu1.2 [169 kB] Fetched 45.6 MB in 1s (46.3 MB/s)
Extracting templates from packages: 100% Selecting previously unselected package
binutils-common:amd64. (Reading database ... 145519 files and directories currently installed.)
Preparing to unpack .../00-binutils-common_2.34-6ubuntu1.11_amd64.deb ... Unpacking
binutils-common:amd64 (2.34-6ubuntu1.11) ... Selecting previously unselected package
libbinutils:amd64. Preparing to unpack .../01-libbinutils_2.34-6ubuntu1.11_amd64.deb ... Unpacking
libbinutils:amd64 (2.34-6ubuntu1.11) ... Selecting previously unselected package
libctf-nobfd0:amd64. Preparing to unpack .../02-libctf-nobfd0_2.34-6ubuntu1.11_amd64.deb ...
Unpacking libctf-nobfd0:amd64 (2.34-6ubuntu1.11) ... Selecting previously unselected package
libctf0:amd64. Preparing to unpack .../03-libctf0_2.34-6ubuntu1.11_amd64.deb ... Unpacking
libctf0:amd64 (2.34-6ubuntu1.11) ... Selecting previously unselected package
binutils-x86-64-linux-gnu. Preparing to unpack
.../04-binutils-x86-64-linux-gnu_2.34-6ubuntu1.11_amd64.deb ... Unpacking binutils-x86-64-linux-gnu
(2.34-6ubuntu1.11) ... Selecting previously unselected package binutils. Preparing to unpack
.../05-binutils_2.34-6ubuntu1.11_amd64.deb ... Unpacking binutils (2.34-6ubuntu1.11) ... Selecting
previously unselected package libc-dev-bin. Preparing to unpack
.../06-libc-dev-bin_2.31-0ubuntu9.18_amd64.deb ... Unpacking libc-dev-bin (2.31-0ubuntu9.18) ...
Selecting previously unselected package linux-libc-dev:amd64. Preparing to unpack
.../07-linux-libc-dev_5.4.0-216.236_amd64.deb ... Unpacking linux-libc-dev:amd64 (5.4.0-216.236) ...
Selecting previously unselected package libcrypt-dev:amd64. Preparing to unpack
.../08-libcrypt-dev_1%3a4.4.10-10ubuntu4_amd64.deb ... Unpacking libcrypt-dev:amd64
(1:4.4.10-10ubuntu4) ... Selecting previously unselected package libc6-dev:amd64. Preparing to
unpack .../09-libc6-dev_2.31-0ubuntu9.18_amd64.deb ... Unpacking libc6-dev:amd64 (2.31-0ubuntu9.18)
... Selecting previously unselected package gcc-9-base:amd64. Preparing to unpack
.../10-gcc-9-base_9.4.0-1ubuntu1~20.04.2_amd64.deb ... Unpacking gcc-9-base:amd64
(9.4.0-1ubuntu1~20.04.2) ... Selecting previously unselected package libisl22:amd64. Preparing to
unpack .../11-libisl22_0.22.1-1_amd64.deb ... Unpacking libisl22:amd64 (0.22.1-1) ... Selecting
previously unselected package libmpc3:amd64. Preparing to unpack .../12-libmpc3_1.1.0-1_amd64.deb
... Unpacking libmpc3:amd64 (1.1.0-1) ... Selecting previously unselected package cpp-9. Preparing
to unpack .../13-cpp-9_9.4.0-1ubuntu1~20.04.2_amd64.deb ... Unpacking cpp-9 (9.4.0-1ubuntu1~20.04.2)
... Selecting previously unselected package cpp. Preparing to unpack
.../14-cpp_4%3a9.3.0-1ubuntu2_amd64.deb ... Unpacking cpp (4:9.3.0-1ubuntu2) ... Selecting
previously unselected package libcc1-0:amd64. Preparing to unpack
.../15-libcc1-0_10.5.0-1ubuntu1~20.04_amd64.deb ... Unpacking libcc1-0:amd64 (10.5.0-1ubuntu1~20.04)
... Selecting previously unselected package libgomp1:amd64. Preparing to unpack
.../16-libgomp1_10.5.0-1ubuntu1~20.04_amd64.deb ... Unpacking libgomp1:amd64 (10.5.0-1ubuntu1~20.04)
... Selecting previously unselected package libitm1:amd64. Preparing to unpack
.../17-libitm1_10.5.0-1ubuntu1~20.04_amd64.deb ... Unpacking libitm1:amd64 (10.5.0-1ubuntu1~20.04)
... Selecting previously unselected package libatomic1:amd64. Preparing to unpack
.../18-libatomic1_10.5.0-1ubuntu1~20.04_amd64.deb ... Unpacking libatomic1:amd64
(10.5.0-1ubuntu1~20.04) ... Selecting previously unselected package libasan5:amd64. Preparing to
unpack .../19-libasan5_9.4.0-1ubuntu1~20.04.2_amd64.deb ... Unpacking libasan5:amd64
(9.4.0-1ubuntu1~20.04.2) ... Selecting previously unselected package liblsan0:amd64. Preparing to
unpack .../20-liblsan0_10.5.0-1ubuntu1~20.04_amd64.deb ... Unpacking liblsan0:amd64
(10.5.0-1ubuntu1~20.04) ... Selecting previously unselected package libtsan0:amd64. Preparing to
unpack .../21-libtsan0_10.5.0-1ubuntu1~20.04_amd64.deb ... Unpacking libtsan0:amd64
(10.5.0-1ubuntu1~20.04) ... Selecting previously unselected package libubsan1:amd64. Preparing to
unpack .../22-libubsan1_10.5.0-1ubuntu1~20.04_amd64.deb ... Unpacking libubsan1:amd64
(10.5.0-1ubuntu1~20.04) ... Selecting previously unselected package libquadmath0:amd64. Preparing to
unpack .../23-libquadmath0_10.5.0-1ubuntu1~20.04_amd64.deb ... Unpacking libquadmath0:amd64
(10.5.0-1ubuntu1~20.04) ... Selecting previously unselected package libgcc-9-dev:amd64. Preparing to
unpack .../24-libgcc-9-dev_9.4.0-1ubuntu1~20.04.2_amd64.deb ... Unpacking libgcc-9-dev:amd64
(9.4.0-1ubuntu1~20.04.2) ... Selecting previously unselected package gcc-9. Preparing to unpack
.../25-gcc-9_9.4.0-1ubuntu1~20.04.2_amd64.deb ... Unpacking gcc-9 (9.4.0-1ubuntu1~20.04.2) ...
Selecting previously unselected package gcc. Preparing to unpack
.../26-gcc_4%3a9.3.0-1ubuntu2_amd64.deb ... Unpacking gcc (4:9.3.0-1ubuntu2) ... Selecting
previously unselected package libstdc++-9-dev:amd64. Preparing to unpack
.../27-libstdc++-9-dev_9.4.0-1ubuntu1~20.04.2_amd64.deb ... Unpacking libstdc++-9-dev:amd64
(9.4.0-1ubuntu1~20.04.2) ... Selecting previously unselected package g++-9. Preparing to unpack
.../28-g++-9_9.4.0-1ubuntu1~20.04.2_amd64.deb ... Unpacking g++-9 (9.4.0-1ubuntu1~20.04.2) ...
Selecting previously unselected package g++. Preparing to unpack
.../29-g++\_4%3a9.3.0-1ubuntu2_amd64.deb ... Unpacking g++ (4:9.3.0-1ubuntu2) ... Selecting
previously unselected package make. Preparing to unpack .../30-make_4.2.1-1.2_amd64.deb ...
Unpacking make (4.2.1-1.2) ... Selecting previously unselected package libdpkg-perl. Preparing to
unpack .../31-libdpkg-perl_1.19.7ubuntu3.2_all.deb ... Unpacking libdpkg-perl (1.19.7ubuntu3.2) ...
Selecting previously unselected package dpkg-dev. Preparing to unpack
.../32-dpkg-dev_1.19.7ubuntu3.2_all.deb ... Unpacking dpkg-dev (1.19.7ubuntu3.2) ... Selecting
previously unselected package build-essential. Preparing to unpack
.../33-build-essential_12.8ubuntu1.1_amd64.deb ... Unpacking build-essential (12.8ubuntu1.1) ...
Selecting previously unselected package libfakeroot:amd64. Preparing to unpack
.../34-libfakeroot_1.24-1_amd64.deb ... Unpacking libfakeroot:amd64 (1.24-1) ... Selecting
previously unselected package fakeroot. Preparing to unpack .../35-fakeroot_1.24-1_amd64.deb ...
Unpacking fakeroot (1.24-1) ... Selecting previously unselected package libalgorithm-diff-perl.
Preparing to unpack .../36-libalgorithm-diff-perl_1.19.03-2_all.deb ... Unpacking
libalgorithm-diff-perl (1.19.03-2) ... Selecting previously unselected package
libalgorithm-diff-xs-perl. Preparing to unpack .../37-libalgorithm-diff-xs-perl_0.04-6_amd64.deb ...
Unpacking libalgorithm-diff-xs-perl (0.04-6) ... Selecting previously unselected package
libalgorithm-merge-perl. Preparing to unpack .../38-libalgorithm-merge-perl_0.08-3_all.deb ...
Unpacking libalgorithm-merge-perl (0.08-3) ... Selecting previously unselected package
libfile-fcntllock-perl. Preparing to unpack .../39-libfile-fcntllock-perl_0.22-3build4_amd64.deb ...
Unpacking libfile-fcntllock-perl (0.22-3build4) ... Selecting previously unselected package
manpages-dev. Preparing to unpack .../40-manpages-dev_5.05-1_all.deb ... Unpacking manpages-dev
(5.05-1) ... Selecting previously unselected package unzip. Preparing to unpack
.../41-unzip_6.0-25ubuntu1.2_amd64.deb ... Unpacking unzip (6.0-25ubuntu1.2) ... Setting up
manpages-dev (5.05-1) ... Setting up libfile-fcntllock-perl (0.22-3build4) ... Setting up
libalgorithm-diff-perl (1.19.03-2) ... Setting up unzip (6.0-25ubuntu1.2) ... Setting up
binutils-common:amd64 (2.34-6ubuntu1.11) ... Setting up linux-libc-dev:amd64 (5.4.0-216.236) ...
Setting up libctf-nobfd0:amd64 (2.34-6ubuntu1.11) ... Setting up libgomp1:amd64
(10.5.0-1ubuntu1~20.04) ... Setting up libfakeroot:amd64 (1.24-1) ... Setting up fakeroot (1.24-1)
... update-alternatives: using /usr/bin/fakeroot-sysv to provide /usr/bin/fakeroot (fakeroot) in
auto mode Setting up make (4.2.1-1.2) ... Setting up libquadmath0:amd64 (10.5.0-1ubuntu1~20.04) ...
Setting up libmpc3:amd64 (1.1.0-1) ... Setting up libatomic1:amd64 (10.5.0-1ubuntu1~20.04) ...
Setting up libdpkg-perl (1.19.7ubuntu3.2) ... Setting up libubsan1:amd64 (10.5.0-1ubuntu1~20.04) ...
Setting up libcrypt-dev:amd64 (1:4.4.10-10ubuntu4) ... Setting up libisl22:amd64 (0.22.1-1) ...
Setting up libbinutils:amd64 (2.34-6ubuntu1.11) ... Setting up libc-dev-bin (2.31-0ubuntu9.18) ...
Setting up libalgorithm-diff-xs-perl (0.04-6) ... Setting up libcc1-0:amd64 (10.5.0-1ubuntu1~20.04)
... Setting up liblsan0:amd64 (10.5.0-1ubuntu1~20.04) ... Setting up libitm1:amd64
(10.5.0-1ubuntu1~20.04) ... Setting up gcc-9-base:amd64 (9.4.0-1ubuntu1~20.04.2) ... Setting up
libalgorithm-merge-perl (0.08-3) ... Setting up libtsan0:amd64 (10.5.0-1ubuntu1~20.04) ... Setting
up libctf0:amd64 (2.34-6ubuntu1.11) ... Setting up libasan5:amd64 (9.4.0-1ubuntu1~20.04.2) ...
Setting up cpp-9 (9.4.0-1ubuntu1~20.04.2) ... Setting up libc6-dev:amd64 (2.31-0ubuntu9.18) ...
Setting up binutils-x86-64-linux-gnu (2.34-6ubuntu1.11) ... Setting up binutils (2.34-6ubuntu1.11)
... Setting up dpkg-dev (1.19.7ubuntu3.2) ... Setting up libgcc-9-dev:amd64 (9.4.0-1ubuntu1~20.04.2)
... Setting up cpp (4:9.3.0-1ubuntu2) ... Setting up gcc-9 (9.4.0-1ubuntu1~20.04.2) ... Setting up
libstdc++-9-dev:amd64 (9.4.0-1ubuntu1~20.04.2) ... Setting up gcc (4:9.3.0-1ubuntu2) ... Setting up
g++-9 (9.4.0-1ubuntu1~20.04.2) ... Setting up g++ (4:9.3.0-1ubuntu2) ... update-alternatives: using
/usr/bin/g++ to provide /usr/bin/c++ (c++) in auto mode Setting up build-essential (12.8ubuntu1.1)
... Processing triggers for libc-bin (2.31-0ubuntu9.18) ... Processing triggers for man-db (2.9.1-1)
... Processing triggers for mime-support (3.64ubuntu1) ... [SUCESSO] Sistema atualizado [2025-09-01
12:15:17] 🕐 Configurando fuso horário e locale... Generating locales (this might take a while)...
pt_BR.UTF-8... done Generation complete. [SUCESSO] Fuso horário e locale configurados [2025-09-01
12:15:19] 📦 Instalando Node.js 18.x... 2025-09-01 12:15:19 - Installing pre-requisites Hit:1
http://br.archive.ubuntu.com/ubuntu focal InRelease Hit:2 http://br.archive.ubuntu.com/ubuntu
focal-updates InRelease Hit:3 http://br.archive.ubuntu.com/ubuntu focal-backports InRelease Hit:4
http://br.archive.ubuntu.com/ubuntu focal-security InRelease Reading package lists... Done Reading
package lists... Done Building dependency tree Reading state information... Done ca-certificates is
already the newest version (20240203~20.04.1). ca-certificates set to manually installed. curl is
already the newest version (7.68.0-1ubuntu2.25). gnupg is already the newest version
(2.2.19-3ubuntu2.5). gnupg set to manually installed. The following packages were automatically
installed and are no longer required: linux-headers-5.4.0-200 linux-headers-5.4.0-200-generic
linux-image-5.4.0-200-generic linux-modules-5.4.0-200-generic linux-modules-extra-5.4.0-200-generic
Use 'apt autoremove' to remove them. The following NEW packages will be installed:
apt-transport-https 0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded. Need to get 1704
B of archives. After this operation, 162 kB of additional disk space will be used. Get:1
http://br.archive.ubuntu.com/ubuntu focal-updates/universe amd64 apt-transport-https all 2.0.11
[1704 B] Fetched 1704 B in 0s (59.4 kB/s) Selecting previously unselected package
apt-transport-https. (Reading database ... 151156 files and directories currently installed.)
Preparing to unpack .../apt-transport-https_2.0.11_all.deb ... Unpacking apt-transport-https
(2.0.11) ... Setting up apt-transport-https (2.0.11) ... Hit:1 http://br.archive.ubuntu.com/ubuntu
focal InRelease Hit:2 http://br.archive.ubuntu.com/ubuntu focal-updates InRelease Hit:3
http://br.archive.ubuntu.com/ubuntu focal-backports InRelease Hit:4
http://br.archive.ubuntu.com/ubuntu focal-security InRelease Get:5
https://deb.nodesource.com/node_18.x nodistro InRelease [12.1 kB] Get:6
https://deb.nodesource.com/node_18.x nodistro/main amd64 Packages [11.6 kB] Fetched 23.7 kB in 1s
(29.8 kB/s) Reading package lists... Done 2025-09-01 12:15:29 - Repository configured successfully.
2025-09-01 12:15:29 - To install Node.js, run: apt-get install nodejs -y 2025-09-01 12:15:29 - You
can use N|solid Runtime as a node.js alternative 2025-09-01 12:15:29 - To install N|solid Runtime,
run: apt-get install nsolid -y

Reading package lists... Done Building dependency tree Reading state information... Done The
following packages were automatically installed and are no longer required: linux-headers-5.4.0-200
linux-headers-5.4.0-200-generic linux-image-5.4.0-200-generic linux-modules-5.4.0-200-generic
linux-modules-extra-5.4.0-200-generic Use 'apt autoremove' to remove them. The following NEW
packages will be installed: nodejs 0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.
Need to get 29.7 MB of archives. After this operation, 187 MB of additional disk space will be used.
Get:1 https://deb.nodesource.com/node_18.x nodistro/main amd64 nodejs amd64 18.20.8-1nodesource1
[29.7 MB] Fetched 29.7 MB in 1s (27.7 MB/s) Selecting previously unselected package nodejs. (Reading
database ... 151160 files and directories currently installed.) Preparing to unpack
.../nodejs_18.20.8-1nodesource1_amd64.deb ... Unpacking nodejs (18.20.8-1nodesource1) ... Setting up
nodejs (18.20.8-1nodesource1) ... Processing triggers for man-db (2.9.1-1) ... [SUCESSO] Node.js
instalado: v18.20.8 [2025-09-01 12:15:47] 📦 Instalando pnpm e PM2...

added 134 packages in 11s

14 packages are looking for funding run `npm fund` for details npm notice npm notice New major
version of npm available! 10.8.2 -> 11.5.2 npm notice Changelog:
https://github.com/npm/cli/releases/tag/v11.5.2 npm notice To update run: npm install -g npm@11.5.2
npm notice [SUCESSO] pnpm instalado: 10.15.1 [SUCESSO] PM2 instalado: -------------

**/\\\\\\\_\_**/\\\***\*\_\_\_\_\*\***/\\\_**\_/\\\\\_\_\_**
_\/\\/////////\\_\/\\\_**\_\_\_**/\\\_\_/\\///////\\**\_
\_\/\\**\_\***\*\/\\_\/\\//\\\_\_\_\_/\\//\\_\///**\_\_**\//\\**
\_\/\\\\\\\/**\/\\///\\/\\/\_\/\\\*\***\_\_\_\***\*/\\/**\_
\_\/\\/////////\_\_**\/\\**\///\\/\_**\/\\**\_\_\_\_**/\\//**\_**
\_\/\\\*\*\*\***\_**\*\***\/\\\_**\_\///\_\_\_**\/\\**\_**/\\//**\_\_\_\_**
\_\/\\**\*\***\_**\*\***\/\\**\*\***\_**\*\***\/\\**\_/\\/\*\***\_**\*\***
\_\/\\**\*\***\_**\*\***\/\\**\*\***\_**\*\***\/\\**/\\\\\\\\\_
\_\///\*\***\_\_\_\_**\*\***\///**\*\***\_\_**\*\***\///**\///////////////**

                          Runtime Edition

        PM2 is a Production Process Manager for Node.js applications
                     with a built-in Load Balancer.

                Start and Daemonize any application:
                $ pm2 start app.js

                Load Balance 4 instances of api.js:
                $ pm2 start api.js -i 4

                Monitor in production:
                $ pm2 monitor

                Make pm2 auto-boot at server restart:
                $ pm2 startup

                To go further checkout:
                http://pm2.io/


                        -------------

[PM2] Spawning PM2 daemon with pm2_home=/root/.pm2 [PM2] PM2 Successfully daemonized 6.0.9
[2025-09-01 12:15:59] 🗄️ Instalando PostgreSQL com correções... [2025-09-01 12:16:00] 📋 Versão do
Ubuntu detectada: focal [2025-09-01 12:16:00] 📦 Ubuntu 20.04 detectado - usando repositório padrão
Ubuntu... [AVISO] ⚠️ Repositório oficial PostgreSQL não disponível para focal (404 Not Found)
Reading package lists... Done Building dependency tree Reading state information... Done The
following packages were automatically installed and are no longer required: linux-headers-5.4.0-200
linux-headers-5.4.0-200-generic linux-image-5.4.0-200-generic linux-modules-5.4.0-200-generic
linux-modules-extra-5.4.0-200-generic Use 'apt autoremove' to remove them. The following additional
packages will be installed: libllvm10 libpq5 libsensors-config libsensors5 postgresql-12
postgresql-client-12 postgresql-client-common postgresql-common ssl-cert sysstat Suggested packages:
lm-sensors postgresql-doc postgresql-doc-12 libjson-perl openssl-blacklist isag The following NEW
packages will be installed: libllvm10 libpq5 libsensors-config libsensors5 postgresql postgresql-12
postgresql-client-12 postgresql-client-common postgresql-common postgresql-contrib ssl-cert sysstat
0 upgraded, 12 newly installed, 0 to remove and 0 not upgraded. Need to get 30.8 MB of archives.
After this operation, 122 MB of additional disk space will be used. Get:1
http://br.archive.ubuntu.com/ubuntu focal/main amd64 libllvm10 amd64 1:10.0.0-4ubuntu1 [15.3 MB]
Get:2 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libpq5 amd64
12.22-0ubuntu0.20.04.4 [119 kB] Get:3 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libsensors-config all 1:3.6.0-2ubuntu1.1 [6052 B] Get:4 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libsensors5 amd64 1:3.6.0-2ubuntu1.1 [27.2 kB] Get:5
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 postgresql-client-common all
214ubuntu0.1 [28.2 kB] Get:6 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
postgresql-client-12 amd64 12.22-0ubuntu0.20.04.4 [1073 kB] Get:7
http://br.archive.ubuntu.com/ubuntu focal/main amd64 ssl-cert all 1.0.39 [17.0 kB] Get:8
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 postgresql-common all 214ubuntu0.1 [169
kB] Get:9 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 postgresql-12 amd64
12.22-0ubuntu0.20.04.4 [13.6 MB] Get:10 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
postgresql all 12+214ubuntu0.1 [3924 B] Get:11 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 postgresql-contrib all 12+214ubuntu0.1 [3932 B] Get:12
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 sysstat amd64 12.2.0-2ubuntu0.3 [448
kB] Fetched 30.8 MB in 2s (13.8 MB/s) Preconfiguring packages ... Selecting previously unselected
package libllvm10:amd64. (Reading database ... 156477 files and directories currently installed.)
Preparing to unpack .../00-libllvm10_1%3a10.0.0-4ubuntu1_amd64.deb ... Unpacking libllvm10:amd64
(1:10.0.0-4ubuntu1) ... Selecting previously unselected package libpq5:amd64. Preparing to unpack
.../01-libpq5_12.22-0ubuntu0.20.04.4_amd64.deb ... Unpacking libpq5:amd64 (12.22-0ubuntu0.20.04.4)
... Selecting previously unselected package libsensors-config. Preparing to unpack
.../02-libsensors-config_1%3a3.6.0-2ubuntu1.1_all.deb ... Unpacking libsensors-config
(1:3.6.0-2ubuntu1.1) ... Selecting previously unselected package libsensors5:amd64. Preparing to
unpack .../03-libsensors5_1%3a3.6.0-2ubuntu1.1_amd64.deb ... Unpacking libsensors5:amd64
(1:3.6.0-2ubuntu1.1) ... Selecting previously unselected package postgresql-client-common. Preparing
to unpack .../04-postgresql-client-common_214ubuntu0.1_all.deb ... Unpacking
postgresql-client-common (214ubuntu0.1) ... Selecting previously unselected package
postgresql-client-12. Preparing to unpack
.../05-postgresql-client-12_12.22-0ubuntu0.20.04.4_amd64.deb ... Unpacking postgresql-client-12
(12.22-0ubuntu0.20.04.4) ... Selecting previously unselected package ssl-cert. Preparing to unpack
.../06-ssl-cert_1.0.39_all.deb ... Unpacking ssl-cert (1.0.39) ... Selecting previously unselected
package postgresql-common. Preparing to unpack .../07-postgresql-common_214ubuntu0.1_all.deb ...
Adding 'diversion of /usr/bin/pg_config to /usr/bin/pg_config.libpq-dev by postgresql-common'
Unpacking postgresql-common (214ubuntu0.1) ... Selecting previously unselected package
postgresql-12. Preparing to unpack .../08-postgresql-12_12.22-0ubuntu0.20.04.4_amd64.deb ...
Unpacking postgresql-12 (12.22-0ubuntu0.20.04.4) ... Selecting previously unselected package
postgresql. Preparing to unpack .../09-postgresql_12+214ubuntu0.1_all.deb ... Unpacking postgresql
(12+214ubuntu0.1) ... Selecting previously unselected package postgresql-contrib. Preparing to
unpack .../10-postgresql-contrib_12+214ubuntu0.1_all.deb ... Unpacking postgresql-contrib
(12+214ubuntu0.1) ... Selecting previously unselected package sysstat. Preparing to unpack
.../11-sysstat_12.2.0-2ubuntu0.3_amd64.deb ... Unpacking sysstat (12.2.0-2ubuntu0.3) ... Setting up
postgresql-client-common (214ubuntu0.1) ... Setting up libsensors-config (1:3.6.0-2ubuntu1.1) ...
Setting up libpq5:amd64 (12.22-0ubuntu0.20.04.4) ... Setting up libllvm10:amd64 (1:10.0.0-4ubuntu1)
... Setting up postgresql-client-12 (12.22-0ubuntu0.20.04.4) ... update-alternatives: using
/usr/share/postgresql/12/man/man1/psql.1.gz to provide /usr/share/man/man1/psql.1.gz (psql.1.gz) in
auto mode Setting up ssl-cert (1.0.39) ... Setting up postgresql-common (214ubuntu0.1) ... Adding
user postgres to group ssl-cert

Creating config file /etc/postgresql-common/createcluster.conf with new version Building PostgreSQL
dictionaries from installed myspell/hunspell packages... Removing obsolete dictionary files: Created
symlink /etc/systemd/system/multi-user.target.wants/postgresql.service →
/lib/systemd/system/postgresql.service. Setting up libsensors5:amd64 (1:3.6.0-2ubuntu1.1) ...
Setting up postgresql-12 (12.22-0ubuntu0.20.04.4) ... Creating new PostgreSQL cluster 12/main ...
/usr/lib/postgresql/12/bin/initdb -D /var/lib/postgresql/12/main --auth-local peer --auth-host md5
The files belonging to this database system will be owned by user "postgres". This user must also
own the server process.

The database cluster will be initialized with locale "pt_BR.UTF-8". The default database encoding
has accordingly been set to "UTF8". The default text search configuration will be set to
"portuguese".

Data page checksums are disabled.

fixing permissions on existing directory /var/lib/postgresql/12/main ... ok creating subdirectories
... ok selecting dynamic shared memory implementation ... posix selecting default max_connections
... 100 selecting default shared_buffers ... 128MB selecting default time zone ... America/Sao_Paulo
creating configuration files ... ok running bootstrap script ... ok performing post-bootstrap
initialization ... ok syncing data to disk ... ok

Success. You can now start the database server using:

    pg_ctlcluster 12 main start

Ver Cluster Port Status Owner Data directory Log file 12 main 5432 down postgres
/var/lib/postgresql/12/main /var/log/postgresql/postgresql-12-main.log update-alternatives: a usar
/usr/share/postgresql/12/man/man1/postmaster.1.gz para disponibilizar
/usr/share/man/man1/postmaster.1.gz (postmaster.1.gz) em modo auto Setting up sysstat
(12.2.0-2ubuntu0.3) ...

Creating config file /etc/default/sysstat with new version update-alternatives: using
/usr/bin/sar.sysstat to provide /usr/bin/sar (sar) in auto mode Created symlink
/etc/systemd/system/multi-user.target.wants/sysstat.service → /lib/systemd/system/sysstat.service.
Setting up postgresql-contrib (12+214ubuntu0.1) ... Setting up postgresql (12+214ubuntu0.1) ...
Processing triggers for systemd (245.4-4ubuntu3.24) ... Processing triggers for man-db (2.9.1-1) ...
Processing triggers for libc-bin (2.31-0ubuntu9.18) ... Synchronizing state of postgresql.service
with SysV service script with /lib/systemd/systemd-sysv-install. Executing:
/lib/systemd/systemd-sysv-install enable postgresql could not change directory to "/root":
Permission denied NOTICE: role "sispat_user" does not exist, skipping DROP ROLE CREATE ROLE CREATE
DATABASE GRANT ALTER ROLE [SUCESSO] PostgreSQL instalado: psql (PostgreSQL) 12.22 (Ubuntu
12.22-0ubuntu0.20.04.4) [2025-09-01 12:16:37] 📦 Instalando Redis... Reading package lists... Done
Building dependency tree Reading state information... Done The following packages were automatically
installed and are no longer required: linux-headers-5.4.0-200 linux-headers-5.4.0-200-generic
linux-image-5.4.0-200-generic linux-modules-5.4.0-200-generic linux-modules-extra-5.4.0-200-generic
Use 'apt autoremove' to remove them. The following additional packages will be installed:
libhiredis0.14 libjemalloc2 liblua5.1-0 lua-bitop lua-cjson redis-tools Suggested packages:
ruby-redis The following NEW packages will be installed: libhiredis0.14 libjemalloc2 liblua5.1-0
lua-bitop lua-cjson redis-server redis-tools 0 upgraded, 7 newly installed, 0 to remove and 0 not
upgraded. Need to get 915 kB of archives. After this operation, 4077 kB of additional disk space
will be used. Get:1 http://br.archive.ubuntu.com/ubuntu focal/universe amd64 libhiredis0.14 amd64
0.14.0-6 [30.2 kB] Get:2 http://br.archive.ubuntu.com/ubuntu focal/universe amd64 libjemalloc2 amd64
5.2.1-1ubuntu1 [235 kB] Get:3 http://br.archive.ubuntu.com/ubuntu focal/universe amd64 liblua5.1-0
amd64 5.1.5-8.1build4 [99.9 kB] Get:4 http://br.archive.ubuntu.com/ubuntu focal/universe amd64
lua-bitop amd64 1.0.2-5 [6680 B] Get:5 http://br.archive.ubuntu.com/ubuntu focal/universe amd64
lua-cjson amd64 2.1.0+dfsg-2.1 [17.4 kB] Get:6 http://br.archive.ubuntu.com/ubuntu
focal-updates/universe amd64 redis-tools amd64 5:5.0.7-2ubuntu0.1 [489 kB] Get:7
http://br.archive.ubuntu.com/ubuntu focal-updates/universe amd64 redis-server amd64
5:5.0.7-2ubuntu0.1 [37.4 kB] Fetched 915 kB in 0s (5873 kB/s) Selecting previously unselected
package libhiredis0.14:amd64. (Reading database ... 158334 files and directories currently
installed.) Preparing to unpack .../0-libhiredis0.14_0.14.0-6_amd64.deb ... Unpacking
libhiredis0.14:amd64 (0.14.0-6) ... Selecting previously unselected package libjemalloc2:amd64.
Preparing to unpack .../1-libjemalloc2_5.2.1-1ubuntu1_amd64.deb ... Unpacking libjemalloc2:amd64
(5.2.1-1ubuntu1) ... Selecting previously unselected package liblua5.1-0:amd64. Preparing to unpack
.../2-liblua5.1-0_5.1.5-8.1build4_amd64.deb ... Unpacking liblua5.1-0:amd64 (5.1.5-8.1build4) ...
Selecting previously unselected package lua-bitop:amd64. Preparing to unpack
.../3-lua-bitop_1.0.2-5_amd64.deb ... Unpacking lua-bitop:amd64 (1.0.2-5) ... Selecting previously
unselected package lua-cjson:amd64. Preparing to unpack .../4-lua-cjson_2.1.0+dfsg-2.1_amd64.deb ...
Unpacking lua-cjson:amd64 (2.1.0+dfsg-2.1) ... Selecting previously unselected package redis-tools.
Preparing to unpack .../5-redis-tools_5%3a5.0.7-2ubuntu0.1_amd64.deb ... Unpacking redis-tools
(5:5.0.7-2ubuntu0.1) ... Selecting previously unselected package redis-server. Preparing to unpack
.../6-redis-server_5%3a5.0.7-2ubuntu0.1_amd64.deb ... Unpacking redis-server (5:5.0.7-2ubuntu0.1)
... Setting up libjemalloc2:amd64 (5.2.1-1ubuntu1) ... Setting up lua-cjson:amd64 (2.1.0+dfsg-2.1)
... Setting up lua-bitop:amd64 (1.0.2-5) ... Setting up liblua5.1-0:amd64 (5.1.5-8.1build4) ...
Setting up libhiredis0.14:amd64 (0.14.0-6) ... Setting up redis-tools (5:5.0.7-2ubuntu0.1) ...
Setting up redis-server (5:5.0.7-2ubuntu0.1) ... Created symlink /etc/systemd/system/redis.service →
/lib/systemd/system/redis-server.service. Created symlink
/etc/systemd/system/multi-user.target.wants/redis-server.service →
/lib/systemd/system/redis-server.service. Processing triggers for systemd (245.4-4ubuntu3.24) ...
Processing triggers for man-db (2.9.1-1) ... Processing triggers for libc-bin (2.31-0ubuntu9.18) ...
Synchronizing state of redis-server.service with SysV service script with
/lib/systemd/systemd-sysv-install. Executing: /lib/systemd/systemd-sysv-install enable redis-server
[SUCESSO] Redis instalado e configurado [2025-09-01 12:16:47] 📦 Instalando Nginx... Reading package
lists... Done Building dependency tree Reading state information... Done The following packages were
automatically installed and are no longer required: linux-headers-5.4.0-200
linux-headers-5.4.0-200-generic linux-image-5.4.0-200-generic linux-modules-5.4.0-200-generic
linux-modules-extra-5.4.0-200-generic Use 'apt autoremove' to remove them. The following additional
packages will be installed: fontconfig-config fonts-dejavu-core libfontconfig1 libgd3
libnginx-mod-http-image-filter libnginx-mod-http-xslt-filter libnginx-mod-mail libnginx-mod-stream
libxpm4 nginx-common nginx-core Suggested packages: libgd-tools fcgiwrap nginx-doc The following NEW
packages will be installed: fontconfig-config fonts-dejavu-core libfontconfig1 libgd3
libnginx-mod-http-image-filter libnginx-mod-http-xslt-filter libnginx-mod-mail libnginx-mod-stream
libxpm4 nginx nginx-common nginx-core 0 upgraded, 12 newly installed, 0 to remove and 0 not
upgraded. Need to get 1941 kB of archives. After this operation, 6230 kB of additional disk space
will be used. Get:1 http://br.archive.ubuntu.com/ubuntu focal/main amd64 fonts-dejavu-core all
2.37-1 [1041 kB] Get:2 http://br.archive.ubuntu.com/ubuntu focal/main amd64 fontconfig-config all
2.13.1-2ubuntu3 [28.8 kB] Get:3 http://br.archive.ubuntu.com/ubuntu focal/main amd64 libfontconfig1
amd64 2.13.1-2ubuntu3 [114 kB] Get:4 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libxpm4 amd64 1:3.5.12-1ubuntu0.20.04.2 [34.9 kB] Get:5 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libgd3 amd64 2.2.5-5.2ubuntu2.4 [118 kB] Get:6
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 nginx-common all 1.18.0-0ubuntu1.7
[37.8 kB] Get:7 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libnginx-mod-http-image-filter amd64 1.18.0-0ubuntu1.7 [14.8 kB] Get:8
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 libnginx-mod-http-xslt-filter amd64
1.18.0-0ubuntu1.7 [13.1 kB] Get:9 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64
libnginx-mod-mail amd64 1.18.0-0ubuntu1.7 [43.0 kB] Get:10 http://br.archive.ubuntu.com/ubuntu
focal-updates/main amd64 libnginx-mod-stream amd64 1.18.0-0ubuntu1.7 [67.3 kB] Get:11
http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 nginx-core amd64 1.18.0-0ubuntu1.7 [425
kB] Get:12 http://br.archive.ubuntu.com/ubuntu focal-updates/main amd64 nginx all 1.18.0-0ubuntu1.7
[3620 B] Fetched 1941 kB in 0s (11.2 MB/s) Preconfiguring packages ... Selecting previously
unselected package fonts-dejavu-core. (Reading database ... 158415 files and directories currently
installed.) Preparing to unpack .../00-fonts-dejavu-core_2.37-1_all.deb ... Unpacking
fonts-dejavu-core (2.37-1) ... Selecting previously unselected package fontconfig-config. Preparing
to unpack .../01-fontconfig-config_2.13.1-2ubuntu3_all.deb ... Unpacking fontconfig-config
(2.13.1-2ubuntu3) ... Selecting previously unselected package libfontconfig1:amd64. Preparing to
unpack .../02-libfontconfig1_2.13.1-2ubuntu3_amd64.deb ... Unpacking libfontconfig1:amd64
(2.13.1-2ubuntu3) ... Selecting previously unselected package libxpm4:amd64. Preparing to unpack
.../03-libxpm4_1%3a3.5.12-1ubuntu0.20.04.2_amd64.deb ... Unpacking libxpm4:amd64
(1:3.5.12-1ubuntu0.20.04.2) ... Selecting previously unselected package libgd3:amd64. Preparing to
unpack .../04-libgd3_2.2.5-5.2ubuntu2.4_amd64.deb ... Unpacking libgd3:amd64 (2.2.5-5.2ubuntu2.4)
... Selecting previously unselected package nginx-common. Preparing to unpack
.../05-nginx-common_1.18.0-0ubuntu1.7_all.deb ... Unpacking nginx-common (1.18.0-0ubuntu1.7) ...
Selecting previously unselected package libnginx-mod-http-image-filter. Preparing to unpack
.../06-libnginx-mod-http-image-filter_1.18.0-0ubuntu1.7_amd64.deb ... Unpacking
libnginx-mod-http-image-filter (1.18.0-0ubuntu1.7) ... Selecting previously unselected package
libnginx-mod-http-xslt-filter. Preparing to unpack
.../07-libnginx-mod-http-xslt-filter_1.18.0-0ubuntu1.7_amd64.deb ... Unpacking
libnginx-mod-http-xslt-filter (1.18.0-0ubuntu1.7) ... Selecting previously unselected package
libnginx-mod-mail. Preparing to unpack .../08-libnginx-mod-mail_1.18.0-0ubuntu1.7_amd64.deb ...
Unpacking libnginx-mod-mail (1.18.0-0ubuntu1.7) ... Selecting previously unselected package
libnginx-mod-stream. Preparing to unpack .../09-libnginx-mod-stream_1.18.0-0ubuntu1.7_amd64.deb ...
Unpacking libnginx-mod-stream (1.18.0-0ubuntu1.7) ... Selecting previously unselected package
nginx-core. Preparing to unpack .../10-nginx-core_1.18.0-0ubuntu1.7_amd64.deb ... Unpacking
nginx-core (1.18.0-0ubuntu1.7) ... Selecting previously unselected package nginx. Preparing to
unpack .../11-nginx_1.18.0-0ubuntu1.7_all.deb ... Unpacking nginx (1.18.0-0ubuntu1.7) ... Setting up
libxpm4:amd64 (1:3.5.12-1ubuntu0.20.04.2) ... Setting up nginx-common (1.18.0-0ubuntu1.7) ...
Created symlink /etc/systemd/system/multi-user.target.wants/nginx.service →
/lib/systemd/system/nginx.service. Setting up libnginx-mod-http-xslt-filter (1.18.0-0ubuntu1.7) ...
Setting up fonts-dejavu-core (2.37-1) ... Setting up libnginx-mod-mail (1.18.0-0ubuntu1.7) ...
Setting up fontconfig-config (2.13.1-2ubuntu3) ... Setting up libnginx-mod-stream
(1.18.0-0ubuntu1.7) ... Setting up libfontconfig1:amd64 (2.13.1-2ubuntu3) ... Setting up
libgd3:amd64 (2.2.5-5.2ubuntu2.4) ... Setting up libnginx-mod-http-image-filter (1.18.0-0ubuntu1.7)
... Setting up nginx-core (1.18.0-0ubuntu1.7) ... Setting up nginx (1.18.0-0ubuntu1.7) ...
Processing triggers for ufw (0.36-6ubuntu1.1) ... Processing triggers for systemd
(245.4-4ubuntu3.24) ... Processing triggers for man-db (2.9.1-1) ... Processing triggers for
libc-bin (2.31-0ubuntu9.18) ... nginx version: nginx/1.18.0 (Ubuntu) [SUCESSO] Nginx instalado:
[2025-09-01 12:16:56] 🔥 Configurando firewall... Rules updated Rules updated (v6) Rules updated
Rules updated (v6) Rules updated Rules updated (v6) Rules updated Rules updated (v6) Firewall is
active and enabled on system startup [SUCESSO] Firewall configurado [2025-09-01 12:16:57] 📥
Clonando repositório SISPAT... Cloning into 'sispat'... remote: Enumerating objects: 1535, done.
remote: Counting objects: 100% (1535/1535), done. remote: Compressing objects: 100% (830/830), done.
remote: Total 1535 (delta 766), reused 1399 (delta 630), pack-reused 0 (from 0) Receiving objects:
100% (1535/1535), 1.75 MiB | 17.24 MiB/s, done. Resolving deltas: 100% (766/766), done. [SUCESSO]
Repositório clonado [2025-09-01 12:16:58] ⚙️ Configurando variáveis de ambiente... [SUCESSO] Arquivo
.env.production criado (SEM NODE_ENV) [2025-09-01 12:16:58] 🔧 Configurando scripts... [2025-09-01
12:16:58] 📦 CORREÇÃO PRÉVIA - Instalando terser para compatibilidade... Downloading
@rolldown/binding-linux-x64-musl@1.0.0-beta.31: 7.35 MB/7.35 MB, done Downloading
@rolldown/binding-linux-x64-gnu@1.0.0-beta.31: 7.38 MB/7.38 MB, done  WARN  7 deprecated
subdependencies found: abab@2.0.6, domexception@4.0.0, glob@7.1.6, glob@7.2.3, inflight@1.0.6,
lodash.get@4.4.2, lodash.isequal@4.5.0 Packages: +1075
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 1170, reused 0, downloaded 1082, added 1075, done  WARN  Issues with peer
dependencies found . ├─┬ @sentry/react 7.120.4 │ └── ✕ unmet peer react@"15.x || 16.x || 17.x ||
18.x": found 19.1.1 ├─┬ cmdk 0.2.1 │ ├── ✕ unmet peer react@^18.0.0: found 19.1.1 │ ├── ✕ unmet peer
react-dom@^18.0.0: found 19.1.1 │ └─┬ @radix-ui/react-dialog 1.0.0 │ ├── ✕ unmet peer react@"^16.8
|| ^17.0 || ^18.0": found 19.1.1 │ ├── ✕ unmet peer react-dom@"^16.8 || ^17.0 || ^18.0": found
19.1.1 │ ├─┬ @radix-ui/react-compose-refs 1.0.0 │ │ └── ✕ unmet peer react@"^16.8 || ^17.0 ||
^18.0": found 19.1.1 │ ├─┬ react-remove-scroll 2.5.4 │ │ ├── ✕ unmet peer react@"^16.8.0 || ^17.0.0
|| ^18.0.0": found 19.1.1 │ │ └── ✕ unmet peer @types/react@"^16.8.0 || ^17.0.0 || ^18.0.0": found
19.1.9 │ ├─┬ @radix-ui/react-context 1.0.0 │ │ └── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0":
found 19.1.1 │ ├─┬ @radix-ui/react-id 1.0.0 │ │ ├── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0":
found 19.1.1 │ │ └─┬ @radix-ui/react-use-layout-effect 1.0.0 │ │ └── ✕ unmet peer react@"^16.8 ||
^17.0 || ^18.0": found 19.1.1 │ ├─┬ @radix-ui/react-portal 1.0.0 │ │ ├── ✕ unmet peer react@"^16.8
|| ^17.0 || ^18.0": found 19.1.1 │ │ ├── ✕ unmet peer react-dom@"^16.8 || ^17.0 || ^18.0": found
19.1.1 │ │ └─┬ @radix-ui/react-primitive 1.0.0 │ │ ├── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0":
found 19.1.1 │ │ ├── ✕ unmet peer react-dom@"^16.8 || ^17.0 || ^18.0": found 19.1.1 │ │ └─┬
@radix-ui/react-slot 1.0.0 │ │ └── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.1.1 │ ├─┬
@radix-ui/react-presence 1.0.0 │ │ ├── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.1.1 │
│ └── ✕ unmet peer react-dom@"^16.8 || ^17.0 || ^18.0": found 19.1.1 │ ├─┬
@radix-ui/react-focus-guards 1.0.0 │ │ └── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0": found
19.1.1 │ ├─┬ @radix-ui/react-use-controllable-state 1.0.0 │ │ ├── ✕ unmet peer react@"^16.8 || ^17.0
|| ^18.0": found 19.1.1 │ │ └─┬ @radix-ui/react-use-callback-ref 1.0.0 │ │ └── ✕ unmet peer
react@"^16.8 || ^17.0 || ^18.0": found 19.1.1 │ ├─┬ @radix-ui/react-focus-scope 1.0.0 │ │ ├── ✕
unmet peer react@"^16.8 || ^17.0 || ^18.0": found 19.1.1 │ │ └── ✕ unmet peer react-dom@"^16.8 ||
^17.0 || ^18.0": found 19.1.1 │ └─┬ @radix-ui/react-dismissable-layer 1.0.0 │ ├── ✕ unmet peer
react@"^16.8 || ^17.0 || ^18.0": found 19.1.1 │ ├── ✕ unmet peer react-dom@"^16.8 || ^17.0 ||
^18.0": found 19.1.1 │ └─┬ @radix-ui/react-use-escape-keydown 1.0.0 │ └── ✕ unmet peer react@"^16.8
|| ^17.0 || ^18.0": found 19.1.1 └─┬ next-themes 0.3.0 ├── ✕ unmet peer react@"^16.8 || ^17 || ^18":
found 19.1.1 └── ✕ unmet peer react-dom@"^16.8 || ^17 || ^18": found 19.1.1

dependencies:

- @hookform/resolvers 3.10.0
- @radix-ui/react-accordion 1.2.11
- @radix-ui/react-alert-dialog 1.1.14
- @radix-ui/react-avatar 1.1.10
- @radix-ui/react-checkbox 1.3.2
- @radix-ui/react-dialog 1.1.14
- @radix-ui/react-dropdown-menu 2.1.15
- @radix-ui/react-label 2.1.7
- @radix-ui/react-popover 1.1.14
- @radix-ui/react-progress 1.1.7
- @radix-ui/react-radio-group 1.3.8
- @radix-ui/react-scroll-area 1.2.10
- @radix-ui/react-select 2.2.5
- @radix-ui/react-separator 1.1.7
- @radix-ui/react-slider 1.3.6
- @radix-ui/react-slot 1.2.3
- @radix-ui/react-switch 1.2.5
- @radix-ui/react-tabs 1.1.12
- @radix-ui/react-toast 1.2.14
- @radix-ui/react-tooltip 1.2.7
- @sentry/react 7.120.4
- @sentry/tracing 7.120.4
- @tailwindcss/aspect-ratio 0.4.2
- @tailwindcss/typography 0.5.16
- @tanstack/react-query 5.85.5
- @tanstack/react-table 8.21.3
- @types/crypto-js 4.2.2
- axios 1.11.0
- bcryptjs 3.0.2
- chalk 5.6.0
- class-variance-authority 0.7.1
- clsx 2.1.1
- cmdk 0.2.1
- cors 2.8.5
- crypto-js 4.2.0
- date-fns 3.6.0
- dotenv 16.6.1
- embla-carousel-react 8.6.0
- express 4.21.2
- express-rate-limit 7.5.1
- framer-motion 11.18.2
- helmet 8.1.0
- jsonwebtoken 9.0.2
- jspdf 3.0.2
- jspdf-autotable 5.0.2
- lucide-react 0.468.0
- multer 2.0.2
- next-themes 0.3.0
- node-cache 5.1.2
- nodemailer 7.0.5
- pg 8.16.3
- prom-client 15.1.3
- rate-limiter-flexible 7.2.0
- react 19.1.1
- react-day-picker 9.9.0
- react-dom 19.1.1
- react-hook-form 7.62.0
- react-router-dom 6.30.1
- react-syntax-highlighter 15.6.6
- recharts 2.15.4
- redis 5.8.2
- socket.io 4.8.1
- socket.io-client 4.8.1
- sonner 2.0.7
- tailwind-merge 2.6.0
- tailwindcss-animate 1.0.7
- uuid 10.0.0
- vite <- rolldown-vite 7.1.0
- winston 3.17.0
- winston-daily-rotate-file 5.0.0
- xlsx 0.18.5
- zod 3.25.76
- zustand 4.5.7

devDependencies:

- @playwright/test 1.55.0
- @testing-library/jest-dom 6.8.0
- @testing-library/react 16.3.0
- @testing-library/user-event 14.6.1
- @types/express 5.0.3
- @types/jest 29.5.14
- @types/node 22.18.0
- @types/qrcode 1.5.5
- @types/react 19.1.9
- @types/react-dom 19.1.7
- @types/speakeasy 2.0.10
- @types/uuid 10.0.0
- @types/ws 8.18.1
- @typescript-eslint/eslint-plugin 8.39.0
- @typescript-eslint/parser 8.39.0
- @vitejs/plugin-react 4.7.0
- autoprefixer 10.4.21
- concurrently 9.2.0
- eslint 9.33.0
- eslint-plugin-react-hooks 5.2.0
- eslint-plugin-react-refresh 0.4.20
- husky 9.1.7
- jest 29.7.0
- jest-environment-jsdom 29.7.0
- js-yaml 4.1.0
- lint-staged 15.5.2
- msw 2.10.5
- node-cron 4.2.1
- nodemon 3.1.10
- postcss 8.5.6
- prettier 3.6.2
- swagger-jsdoc 6.2.8
- swagger-ui-express 5.0.1
- tailwindcss 3.4.17
- terser 5.43.1
- ts-jest 29.4.1
- typescript 5.9.2
- vitest 2.1.9
- web-vitals 5.1.0

╭ Warning ───────────────────────────────────────────────────────────────────────────────────╮ │ │ │
Ignored build scripts: @scarf/scarf, core-js, esbuild, msw. │ │ Run "pnpm approve-builds" to pick
which dependencies should be allowed to run scripts. │ │ │
╰────────────────────────────────────────────────────────────────────────────────────────────╯

Done in 41.2s using pnpm v10.15.1 [SUCESSO] Terser instalado com pnpm [2025-09-01 12:17:39] ⚙️
Executando setup de produção... [2025-09-01 12:17:39] 🔧 Configurando ambiente de produção para
SISPAT... [2025-09-01 12:17:39] 📋 Verificando sistema operacional... [SUCESSO] Sistema Linux
detectado [2025-09-01 12:17:39] 🔍 Verificando dependências do sistema... [2025-09-01 12:17:39] ✅
Node.js encontrado: v18.20.8 [SUCESSO] ✅ pnpm encontrado: 10.15.1 [SUCESSO] ✅ PM2 encontrado:
6.0.9 [2025-09-01 12:17:40] ⚙️ Configurando variáveis de ambiente... [SUCESSO] Arquivo
.env.production já existe [2025-09-01 12:17:40] 🔐 Configurando credenciais de segurança...
[SUCESSO] JWT_SECRET já configurado [2025-09-01 12:17:40] 🗄️ Verificando configuração do banco de
dados... [SUCESSO] PostgreSQL está rodando [2025-09-01 12:17:40] 🔴 Verificando configuração do
Redis... [SUCESSO] Redis está rodando [2025-09-01 12:17:40] 📝 Configurando diretórios de logs...
[SUCESSO] Diretórios de logs criados [2025-09-01 12:17:40] ⚙️ Configurando PM2... [SUCESSO] Arquivo
de configuração PM2 encontrado [2025-09-01 12:17:40] 🔥 Configurando firewall básico... [SUCESSO]
UFW está ativo [2025-09-01 12:17:40] 💾 Configurando backup automático... [SUCESSO] Script de backup
criado [2025-09-01 12:17:40] 🔧 Resolvendo problema do pnpm-lock.yaml... [2025-09-01 12:17:40] 📦
Tentando resolver incompatibilidade do lockfile...  WARN  using --force I sure hope you know what
you are doing Lockfile is up to date, resolution step is skipped Packages: +1170
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Downloading @rolldown/binding-android-arm64@1.0.0-beta.31: 6.90 MB/6.90 MB, done Downloading
@rolldown/binding-linux-arm-gnueabihf@1.0.0-beta.31: 6.89 MB/6.89 MB, done Downloading
@rolldown/binding-freebsd-x64@1.0.0-beta.31: 7.33 MB/7.33 MB, done Downloading
@rolldown/binding-darwin-arm64@1.0.0-beta.31: 6.72 MB/6.72 MB, done Downloading
@rolldown/binding-linux-arm64-gnu@1.0.0-beta.31: 6.96 MB/6.96 MB, done Downloading
@rolldown/binding-darwin-x64@1.0.0-beta.31: 7.11 MB/7.11 MB, done Downloading
@rolldown/binding-linux-arm64-ohos@1.0.0-beta.31: 6.84 MB/6.84 MB, done Downloading
@rolldown/binding-linux-arm64-musl@1.0.0-beta.31: 6.90 MB/6.90 MB, done Downloading
@rolldown/binding-win32-arm64-msvc@1.0.0-beta.31: 7.09 MB/7.09 MB, done Downloading
@rolldown/binding-win32-ia32-msvc@1.0.0-beta.31: 6.86 MB/6.86 MB, done Downloading
@rolldown/binding-win32-x64-msvc@1.0.0-beta.31: 7.57 MB/7.57 MB, done  WARN  GET
https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.21.5.tgz error (ERR_SOCKET_TIMEOUT).
Will retry in 10 seconds. 2 retries left. Progress: resolved 1170, reused 1082, downloaded 88, added
1170, done

╭ Warning ───────────────────────────────────────────────────────────────────────────────────╮ │ │ │
Ignored build scripts: @scarf/scarf, core-js, esbuild, msw. │ │ Run "pnpm approve-builds" to pick
which dependencies should be allowed to run scripts. │ │ │
╰────────────────────────────────────────────────────────────────────────────────────────────╯

. prepare$ husky install │ husky - install command is DEPRECATED └─ Done in 144ms Done in 1m 22.1s
using pnpm v10.15.1 [SUCESSO] Dependências instaladas com sucesso [2025-09-01 12:19:02] 🎯
Configuração final... [SUCESSO] ✅ Configuração básica concluída!

🚀 PRÓXIMOS PASSOS:

1. Edite o arquivo .env.production com suas configurações reais
2. Configure o banco de dados PostgreSQL
3. Configure o Redis
4. Execute: ./scripts/deploy-production-simple.sh

📋 COMANDOS ÚTEIS:

- Ver status: pm2 status
- Ver logs: pm2 logs
- Backup: ./scripts/backup.sh

[2025-09-01 12:19:02] 🎉 Script de configuração concluído! [SUCESSO] Ambiente de produção
configurado com sucesso! [2025-09-01 12:19:02] 🚀 Executando deploy... [2025-09-01 12:19:02] 🚀
Iniciando deploy simplificado para produção... [2025-09-01 12:19:02] 📋 Verificando variáveis de
ambiente... [2025-09-01 12:19:02] 💾 Criando backup do sistema atual... [2025-09-01 12:19:02] 🛑
Parando serviços em execução... [AVISO] Backend não estava rodando [AVISO] Frontend não estava
rodando [SUCESSO] Serviços parados [2025-09-01 12:19:03] 🧹 Limpando builds anteriores... [SUCESSO]
Cache limpo [2025-09-01 12:19:03] 📦 Instalando dependências de produção... [2025-09-01 12:19:03] 🔧
Instalando Husky para hooks de qualidade... Lockfile is up to date, resolution step is skipped
Already up to date

╭ Warning ───────────────────────────────────────────────────────────────────────────────────╮ │ │ │
Ignored build scripts: @scarf/scarf, core-js, esbuild, msw. │ │ Run "pnpm approve-builds" to pick
which dependencies should be allowed to run scripts. │ │ │
╰────────────────────────────────────────────────────────────────────────────────────────────╯

. prepare$ husky install │ husky - install command is DEPRECATED └─ Done in 330ms Done in 3.7s using
pnpm v10.15.1 [SUCESSO] Dependências instaladas com pnpm [2025-09-01 12:19:07] 🔧 Configurando
Husky... npm info using npm@10.8.2 npm info using node@v18.20.8 husky - install command is
DEPRECATED npm info ok [SUCESSO] Husky configurado com sucesso [2025-09-01 12:19:08] 📋 Hooks
disponíveis: total 16 drwxr-xr-x 3 root root 4096 Sep 1 12:19 . drwxr-xr-x 22 root root 4096 Sep 1
12:19 .. drwxr-xr-x 2 root root 4096 Sep 1 12:19 \_ -rw-r--r-- 1 root root 27 Sep 1 12:16 pre-commit
[SUCESSO] Dependências instaladas [2025-09-01 12:19:08] 🔨 Gerando build de produção...

> sispat-sistema-patrimonial@0.0.193 build /var/www/sispat tsc && vite build

[vite:react-babel] We recommend switching to `@vitejs/plugin-react-oxc` for improved performance.
More information at https://vite.dev/rolldown rolldown-vite v7.1.0 building for production...
transforming... ✓ 4242 modules transformed. rendering chunks... [lightningcss minify] Unknown at
rule: @tailwind 3 | margin: 0 !important; 4 | } 5 | @tailwind base; | ^ 6 | @tailwind components; 7
| @tailwind utilities; [lightningcss minify] Unknown at rule: @tailwind 4 | } 5 | @tailwind base; 6
| @tailwind components; | ^ 7 | @tailwind utilities; 8 | [lightningcss minify] Unknown at rule:
@tailwind 5 | @tailwind base; 6 | @tailwind components; 7 | @tailwind utilities; | ^ 8 | 9 | @layer
base { [lightningcss minify] Unknown at rule: @apply 68 | 69 | body { 70 | @apply bg-background
text-foreground; | ^ 71 | font-feature-settings: 72 | 'rlig' 1, computing gzip size...
dist/index.html 1.56 kB │ gzip: 0.63 kB dist/assets/index-BiexWWDn.css 2.92 kB │ gzip: 0.99 kB
dist/assets/purify.es-CPI*NatB.js 0.06 kB │ gzip: 0.08 kB dist/assets/html2canvas-CI_QHVUl.js 0.07
kB │ gzip: 0.09 kB dist/assets/jspdf.plugin.autotable-CGlJMBf2.js 0.28 kB │ gzip: 0.19 kB
dist/assets/xlsx-Cmx71ISQ.js 0.43 kB │ gzip: 0.25 kB dist/assets/jspdf.es.min-gbnVl9Tn.js 0.49 kB │
gzip: 0.27 kB dist/assets/vendor-radix-40Vn7ur5.js 0.53 kB │ gzip: 0.22 kB
dist/assets/DashboardRedirect-ZkIwkRt7.js 0.53 kB │ gzip: 0.35 kB
dist/assets/imovel-fields-BFgGGvJ3.js 0.53 kB │ gzip: 0.30 kB
dist/assets/depreciation-utils-C5G413sp.js 0.66 kB │ gzip: 0.35 kB
dist/assets/rolldown-runtime-DUhow6d-.js 0.68 kB │ gzip: 0.41 kB
dist/assets/masked-input-dH90YEQh.js 0.70 kB │ gzip: 0.38 kB dist/assets/NotFound-B3kTCPO*.js 0.77
kB │ gzip: 0.45 kB dist/assets/radio-group-DF7GEnUm.js 0.84 kB │ gzip: 0.46 kB
dist/assets/report-utils-y7Yoii-3.js 0.87 kB │ gzip: 0.37 kB dist/assets/switch-ChkdD5Mt.js 0.90 kB
│ gzip: 0.49 kB dist/assets/alert-ByXMcLVG.js 1.08 kB │ gzip: 0.55 kB
dist/assets/accordion-CJp2oJI8.js 1.08 kB │ gzip: 0.55 kB
dist/assets/SuperuserFooterCustomization-CcXMsDt1.js 1.45 kB │ gzip: 0.73 kB
dist/assets/date-picker-BnXt4rLo.js 1.53 kB │ gzip: 0.65 kB dist/assets/table-BTTqJjKo.js 1.63 kB │
gzip: 0.59 kB dist/assets/Notifications-kffjnqra.js 1.73 kB │ gzip: 0.79 kB
dist/assets/PublicSearchSettings-Byf0DZtD.js 1.75 kB │ gzip: 0.80 kB
dist/assets/SystemInformation-BFlncXG9.js 1.82 kB │ gzip: 0.85 kB dist/assets/Settings-CkFls_bo.js
1.84 kB │ gzip: 0.84 kB dist/assets/optimized-image-CFr0wOqi.js 1.91 kB │ gzip: 0.91 kB
dist/assets/PrintConfigDialog-DoAzf2LZ.js 2.04 kB │ gzip: 0.93 kB
dist/assets/LabelPreview-DH0FmVLo.js 2.07 kB │ gzip: 1.17 kB dist/assets/multi-select-eUkljK56.js
2.08 kB │ gzip: 1.02 kB dist/assets/ImoveisReportTemplates-BXVoETPI.js 2.16 kB │ gzip: 0.89 kB
dist/assets/index.es-4AkX1RiO.js 2.27 kB │ gzip: 1.05 kB dist/assets/ForgotPassword-CTjAH1dk.js 2.30
kB │ gzip: 1.11 kB dist/assets/Downloads-YknMnfjH.js 2.44 kB │ gzip: 0.94 kB
dist/assets/ExportConfigDialog-DrjhgJPu.js 2.44 kB │ gzip: 1.08 kB
dist/assets/LabelTemplates-C6I--cIh.js 2.49 kB │ gzip: 0.99 kB dist/assets/pagination-D1cKAJPK.js
2.54 kB │ gzip: 1.00 kB dist/assets/ImoveisReportEditor-C4Tjx3SB.js 2.55 kB │ gzip: 1.22 kB
dist/assets/AssetsByUser-DZGM8M-Y.js 2.56 kB │ gzip: 1.16 kB dist/assets/AnaliseTipo-DtqJCZwk.js
2.57 kB │ gzip: 1.13 kB dist/assets/GeneralDocuments-C1oI2tnX.js 2.67 kB │ gzip: 1.17 kB
dist/assets/AnaliseSetor-C7KGuy7d.js 2.76 kB │ gzip: 1.30 kB dist/assets/ImoveisMapa-C7vPb-kd.js
2.77 kB │ gzip: 1.22 kB dist/assets/PermissionManagement-Da-PV8BT.js 2.82 kB │ gzip: 1.15 kB
dist/assets/InventarioSummary-CgTiPKy3.js 2.84 kB │ gzip: 1.06 kB dist/assets/carousel-DQW2bBtb.js
2.91 kB │ gzip: 1.17 kB dist/assets/Depreciacao-TDi3X4Qa.js 2.95 kB │ gzip: 1.17 kB
dist/assets/AnaliseTemporal-DkjUKJYJ.js 3.03 kB │ gzip: 1.29 kB
dist/assets/ViewerDashboard-BnqrQRS6.js 3.10 kB │ gzip: 1.29 kB
dist/assets/InventarioDetail-B_uWu1PW.js 3.16 kB │ gzip: 1.30 kB
dist/assets/InventariosList-Hrb_02dr.js 3.20 kB │ gzip: 1.30 kB
dist/assets/UserManagement-DR9X9IlV.js 3.31 kB │ gzip: 1.30 kB
dist/assets/TransferenciaReports-BKuJHctr.js 3.36 kB │ gzip: 1.40 kB
dist/assets/UserDashboard--B18DPWZ.js 3.51 kB │ gzip: 1.48 kB
dist/assets/InventarioCreate-BP90HX0x.js 3.66 kB │ gzip: 1.42 kB dist/assets/Locais-CUn5GFeX.js 3.84
kB │ gzip: 1.63 kB dist/assets/ActivityLog-DXLboxdA.js 3.85 kB │ gzip: 1.58 kB
dist/assets/ResetPassword-BpUi0PBZ.js 3.88 kB │ gzip: 1.50 kB
dist/assets/ImoveisManutencao-C1rF1BrK.js 4.00 kB │ gzip: 1.58 kB dist/assets/SyncClient-FNLqmCYe.js
4.07 kB │ gzip: 1.33 kB dist/assets/NumberingSettings-DSLRzt4v.js 4.07 kB │ gzip: 1.60 kB
dist/assets/Relatorios-Bn6zk9Ju.js 4.08 kB │ gzip: 1.55 kB dist/assets/export-utils-CHot2eAh.js 4.08
kB │ gzip: 1.74 kB dist/assets/PublicImovelDetalhe-BkZoeosb.js 4.20 kB │ gzip: 1.71 kB
dist/assets/DepreciationDashboard-Dkp5dUuC.js 4.24 kB │ gzip: 1.43 kB dist/assets/chart-BAAPl2BN.js
4.57 kB │ gzip: 1.95 kB dist/assets/RelatoriosDepreciacao-B_BjXQ3k.js 4.58 kB │ gzip: 1.65 kB
dist/assets/calendar-B_TUpePI.js 4.58 kB │ gzip: 1.66 kB dist/assets/ImoveisList-Bah1lS_S.js 4.63 kB
│ gzip: 1.85 kB dist/assets/BackupSettings-phLjR731.js 4.70 kB │ gzip: 2.01 kB
dist/assets/SuperuserDashboard-C7kDUhX7.js 4.76 kB │ gzip: 1.43 kB
dist/assets/VersionUpdate-F7ECY1Xt.js 4.78 kB │ gzip: 1.66 kB
dist/assets/ReportTemplates-DZ_Lkm-x.js 4.78 kB │ gzip: 1.88 kB
dist/assets/SystemMonitoring-BZKXHF0s.js 5.06 kB │ gzip: 1.66 kB dist/assets/ReportView-LNhIx2ym.js
5.14 kB │ gzip: 1.96 kB dist/assets/Emprestimos-D3eqxSl-.js 5.20 kB │ gzip: 2.00 kB
dist/assets/ExcelCsvTemplateManagement-BaEkWtta.js 5.31 kB │ gzip: 1.89 kB
dist/assets/ImovelCustomFields-C3WMbLKu.js 5.61 kB │ gzip: 2.07 kB
dist/assets/ImoveisCreate-DpSoCjtg.js 5.80 kB │ gzip: 1.97 kB
dist/assets/GlobalLogoSettings-CVfHT_JY.js 5.82 kB │ gzip: 2.01 kB dist/assets/Profile-DGQveTDv.js
5.86 kB │ gzip: 2.33 kB dist/assets/SupervisorDashboard-CWOwrOFD.js 5.94 kB │ gzip: 2.23 kB
dist/assets/GerarEtiquetas-\_d4Ks1_3.js 6.13 kB │ gzip: 2.41 kB dist/assets/ImoveisEdit-Cm4AJGwB.js
6.18 kB │ gzip: 2.09 kB dist/assets/SystemCustomization-B_nIiMcF.js 6.26 kB │ gzip: 1.89 kB
dist/assets/ReportLayoutEditor-BN89PK8Z.js 6.88 kB │ gzip: 2.35 kB
dist/assets/Transferencias-BWJ9usTb.js 6.99 kB │ gzip: 2.29 kB
dist/assets/SectorManagement-BvcfOsJm.js 7.37 kB │ gzip: 2.64 kB
dist/assets/FormFieldManagement-Bwb3KfdL.js 7.63 kB │ gzip: 2.67 kB
dist/assets/LabelTemplateEditor-Uo7QJ-RS.js 7.64 kB │ gzip: 2.42 kB
dist/assets/PublicConsultation-DPxJkyWK.js 7.89 kB │ gzip: 2.57 kB
dist/assets/Exportacao-BpfJ-gK4.js 8.02 kB │ gzip: 2.60 kB dist/assets/BensCadastrados-DTvbJDOs.js
8.79 kB │ gzip: 2.27 kB dist/assets/Documentation-Dc9IUv_g.js 8.86 kB │ gzip: 3.52 kB
dist/assets/AdminDashboard-BKIr3JyH.js 8.99 kB │ gzip: 2.95 kB
dist/assets/MunicipalityManagement-C7plbVk6.js 9.16 kB │ gzip: 3.10 kB
dist/assets/ImoveisView-D6AdvAPz.js 10.59 kB │ gzip: 3.57 kB dist/assets/Login-D0LUo-1N.js 10.76 kB
│ gzip: 3.66 kB dist/assets/SummaryDashboard-he29_0vE.js 12.44 kB │ gzip: 3.39 kB
dist/assets/PublicAssets-DfyVei6u.js 12.93 kB │ gzip: 4.24 kB dist/assets/BensEdit-Qeae3ZTb.js 13.77
kB │ gzip: 3.95 kB dist/assets/UserManagement-EYDvBoE1.js 15.22 kB │ gzip: 4.03 kB
dist/assets/BensView-Pz6yE6xk.js 18.51 kB │ gzip: 5.42 kB dist/assets/SecuritySettings-DvA6QRcO.js
19.68 kB │ gzip: 4.77 kB dist/assets/SystemAudit-D3tG1fJs.js 23.78 kB │ gzip: 3.79 kB
dist/assets/index-CJvu_42u.js 207.39 kB │ gzip: 54.13 kB dist/assets/vendor-react-BJXeYePH.js 842.23
kB │ gzip: 234.34 kB dist/assets/vendor-3L2rBmPt.js 1,721.44 kB │ gzip: 538.02 kB

(!) Some chunks are larger than 1000 kB after minification. Consider:

- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking:
  https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit. ✓ built in 5.56s
  [SUCESSO] Build gerado com sucesso [2025-09-01 12:19:15] ✅ Verificando build... [SUCESSO] Build
  verificado - index.html encontrado [2025-09-01 12:19:15] ⚙️ Configurando variáveis de ambiente...
  ./scripts/deploy-production-simple.sh: line 140: export:
  `2': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `ANALISE_PROBLEMAS_SISPAT.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `AUDITORIA_SISTEMA.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `CRONOGRAMA_IMPLEMENTACOES.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `Dockerfile.frontend': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `HUSKY-PRODUCTION-FIX.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `PM2_DEPLOY_GUIDE.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `POSTGRESQL-UBUNTU20-FIX.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `POSTGRESQL_SETUP.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `PRODUCTION-DEPLOY-GUIDE.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `README.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `RESUMO_REVISAO_FINAL.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `VPS-INSTALLATION-GUIDE-UPDATED.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `bun.lockb':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `check-sectors.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `check_table.sql':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `components.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `docker-compose.production.yml':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `docker-compose.staging.yml': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `ecosystem.config.cjs':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `ecosystem.config.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `env.example':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `env.production': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `env.production.example':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `env.staging.example': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `eslint.config.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `eslint.config.test.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `index.html':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `install-postgresql.ps1': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `jest.config.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `lighthouserc.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `nginx.conf':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `nginx.proxy.conf': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `package.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `patrimonio-list.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `playwright.config.ts':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `pnpm-lock.yaml': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `pnpm-workspace.yaml':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `postcss.config.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `production-checklist.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `setup-system.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `setup.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `tailwind.config.ts': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `test-check-patrimonio.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `test-delete-municipality.sh': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `test-municipality-deletion.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `test-system.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `tsconfig.app.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `tsconfig.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `tsconfig.node.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `tsconfig.test.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `tsconfig.typecheck.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `vite.config.ts': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `vitest.coverage.config.ts':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `ANALISE_PROBLEMAS_SISPAT.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `AUDITORIA_SISTEMA.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `CRONOGRAMA_IMPLEMENTACOES.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `Dockerfile.frontend':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `HUSKY-PRODUCTION-FIX.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `PM2_DEPLOY_GUIDE.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `POSTGRESQL-UBUNTU20-FIX.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `POSTGRESQL_SETUP.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `PRODUCTION-DEPLOY-GUIDE.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `README.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `RESUMO_REVISAO_FINAL.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `VPS-INSTALLATION-GUIDE-UPDATED.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `bun.lockb': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `check-sectors.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `check_table.sql': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `components.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `docker-compose.production.yml': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `docker-compose.staging.yml':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `ecosystem.config.cjs': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `ecosystem.config.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `env.example': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `env.production':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `env.production.example': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `env.staging.example':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `eslint.config.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `eslint.config.test.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `index.html': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `install-postgresql.ps1':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `jest.config.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `lighthouserc.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `nginx.conf': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `nginx.proxy.conf':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `package.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `patrimonio-list.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `playwright.config.ts': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `pnpm-lock.yaml':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `pnpm-workspace.yaml': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `postcss.config.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `production-checklist.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `setup-system.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `setup.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `tailwind.config.ts':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `test-check-patrimonio.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `test-delete-municipality.sh':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `test-municipality-deletion.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `test-system.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `tsconfig.app.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `tsconfig.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `tsconfig.node.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `tsconfig.test.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `tsconfig.typecheck.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `vite.config.ts':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `vitest.coverage.config.ts': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `ANALISE_PROBLEMAS_SISPAT.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `AUDITORIA_SISTEMA.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `CRONOGRAMA_IMPLEMENTACOES.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `Dockerfile.frontend': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `HUSKY-PRODUCTION-FIX.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `PM2_DEPLOY_GUIDE.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `POSTGRESQL-UBUNTU20-FIX.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `POSTGRESQL_SETUP.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `PRODUCTION-DEPLOY-GUIDE.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `README.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `RESUMO_REVISAO_FINAL.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `VPS-INSTALLATION-GUIDE-UPDATED.md': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `bun.lockb':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `check-sectors.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `check_table.sql':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `components.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `docker-compose.production.yml':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `docker-compose.staging.yml': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `ecosystem.config.cjs':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `ecosystem.config.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `env.example':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `env.production': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `env.production.example':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `env.staging.example': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `eslint.config.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `eslint.config.test.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `index.html':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `install-postgresql.ps1': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `jest.config.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `lighthouserc.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `nginx.conf':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `nginx.proxy.conf': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `package.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `patrimonio-list.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `playwright.config.ts':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `pnpm-lock.yaml': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `pnpm-workspace.yaml':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `postcss.config.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `production-checklist.md':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `setup-system.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `setup.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `tailwind.config.ts': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `test-check-patrimonio.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `test-delete-municipality.sh': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `test-municipality-deletion.js':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `test-system.js': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `tsconfig.app.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `tsconfig.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `tsconfig.node.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `tsconfig.test.json': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `tsconfig.typecheck.json':
  not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export:
  `vite.config.ts': not a valid identifier ./scripts/deploy-production-simple.sh: line 140: export: `vitest.coverage.config.ts':
  not a valid identifier root@sispat:~# ^C root@sispat:~#

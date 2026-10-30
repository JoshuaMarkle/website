---
title: "Setup DOMJudge Server With AWS"
date: 2025-06-14
minutes: 9
tags: [code]
excerpt: "A complete setup guide to installing DOMJudge on AWS servers to host programming competitions. I will walk you through the exact steps you need to set up a server and minimize the cost of contests."
cover: "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.domjudge.org%2Fdocs%2Fmanual%2F8.3%2F_images%2Fteam-overview.png&f=1&nofb=1&ipt=88809bd387e38f36d881cd1028fabf3831c7c80c593154eb71dcb2a1c66d15f6&ipo=images"
---

This is a minimal install of the DOMJudge server. This will affect some of the choices made within this instruction set to try and minimize the cost of the server. The most minimal install will work best with under 20 teams and problems that do not require that much time to compute (smaller inputs and outputs). If you want to create a competition with computation heavy problems, you will have to select a more powerful EC2 (talked about later).

If you have a specific use-case or problem, take a look at the **Reference** section at the back of this guide 😄.

> [!IMPORTANT]
> Staying within the free tier is not possible because AWS charges the web traffic. It will cost a few cents in order to run the server for competitions but it will not be a large amount of money. Depending on the load, it will range from a few cents to a dollar per competition.

## Commonly Used Terms

Just a small list of things that you should know to fully understand this install

- AWS: Amazon Web Services is a service by Amazon that offers cloud servers that will run all of the backend code to the DOMJudge
- EC2: The name of the specific sever type that we are using on AWS.
- DOM Server: All of the DOMJudge code that runs the server. It has its own dedicated EC2 in this install.
- DOM Judge: All of the DOMJudge code that tests user submissions on the DOM Server. It has its own dedicated EC2 in this install. You can have as many judges as you need depending on the number of teams.

## Creating The Account

Go through the process to make a new AWS account on [https://aws.amazon.com/](https://aws.amazon.com/). This account is required to have a payment method attached in order for the ability to create EC2 instances. Go through the entire process of verifying your account.

> [!NOTE]
> This will take some time. After completing the verification process, you will have to wait an hour or two (up to 24h according to AWS) for your account to be verified.

## Make The Instance

On the homepage in the first widget, click on EC2. This will bring you to a page with all of your EC2 instances. Create An Instance to host the actual DOM Server.

For this minimal installation, the instance will be:

- Named: DOMServer
- A Ubuntu Operating Sysetem
- t2.micro Processor
- 12GB (GP2)

> [!IMPORTANT]
> The actual EC2 will depend on your specific needs. This is a minimal installation that attemps to stay as cheap as possible. If you are going to have a bunch of competitions at once with a lot of problems, it might be a good idea to select more storage space. (Anything under 30GB is within the free tier)

Make sure to create a RSA keypair (pem) and store it in a safe location on your computer. You will use this later to ssh into the server. I named mine DOMJudge.

As for the network settings, allow SSH traffic from any IP (This is not good practice but this is convient for me). If you aren't comfortable by that, you can set it to your computer's unique IP address so only you can ssh from that specfic computer. You will need to set the web traffic to true for both HTTPS and HTTP.

## Setup the Database

Now that the EC2 Instance has been created, we can now ssh into the server. Go to the the EC2 Instances page on AWS. Here you can click on your EC2 for find the public IP.

SSH into the server to start installing

```bash
ssh -i /path/to/pemFile.pem ubuntu@public_ip_address_of_EC2
```

Example: `ssh -i DomJudge.pem ubuntu@169.254.369.254`

## Update Server

> [!WARNING]
> The dependencies will not work correctly without an update to the system.

> [!NOTE]
> If you chose an operating system other than Ubuntu, this might look different depending on the OS you chose

```bash
sudo apt update
sudo apt upgrade
```

## Dependencies

> [!NOTE]
> Running this will take a bit of time...

```bash
sudo apt install acl zip unzip mariadb-server apache2 \
    php php-fpm php-gd php-cli php-intl php-mbstring \
    php-mysql php-curl php-json php-xml php-zip composer \
    ntp autoconf automake bats gcc python3-sphinx \
    python3-sphinx-rtd-theme rst2pdf fontconfig python3-yaml \
    latexmk texlive-latex-recommended texlive-latex-extra \
    tex-gyre gcc g++ make zip unzip php-fpm php-cli php-gd \
    php-curl php-mbstring php-mysql php-json php-xml php-zip \
    bsdmainutils ntp linuxdoc-tools linuxdoc-tools-text \
    groff texlive-latex-recommended texlive-latex-extra \
    texlive-fonts-recommended apache2 mysql-client \
    mysql-server libapache2-mod-php libcgroup-dev
```

Now to actually download all of the code for DOMJudge. For this install, I am using DOMJudge 8.2.2:

> [!NOTE]
> If there is a newer version of DOMJudge, I suggest using that version. This link was taken right off of [https://www.domjudge.org](https://www.domjudge.org). If you do have a different version, the next few commands will change based on that version.

```bash
wget https://www.domjudge.org/releases/domjudge-8.2.2.tar.gz
```

Extract the downloaded release file:

```bash
tar -xf domjudge-8.2.2.tar.gz
```

## Bootstrap The Configuration File

Since the downloaded and extracted domjudge doesn't inherently have a `configure` script by default, you will have to manually build it with `make dist`.

```bash
cd domjudge-8.2.2
make dist
```

## Install DOMJudge Server

This will install the actualy DOMServer in the ~ directory.

> [!NOTE]
> You can change the prefex to any directory. Installing in the home directory is going to cause a few problems that are fixed later but I think makes everything easier to track.

```bash
./configure --prefix=$HOME/domjudge
make domserver
sudo make install-domserver
```

## Database Configuration

Create the randomly generated password for the database. Inside the `domserver/bin`:

```bash
cd ~/domjudge/domserver/bin
./dj_setup_database genpass
```

If you want fine control over the database, you can edit the `dbpasswords.secret` to make your own password to access the database

```bash
cd ~/domjudge/domserver/etc
sudo vi dbpasswords.secret
```

The file will look something like this:

```text
# Randomly generated on host ip-*-*-*-*, Thu Oct * *:*:* UTC *
# Format: 'dummy:<db_host>:<db_name>:<user>:<password>'
dummy:localhost:domjudge:domjudge:_YourPasswordHere_
```

> [!WARNING]
> Make sure that SQL is actually working with the command: `sudo systemctl status mysql`. If it is not enabled, enable it. If it is not running or if you get any dumb SQL errors (like me), I suggest doing a clean reinstall for mysql:

```bash
sudo rm -rf /etc/mysql
sudo rm -rf /var/lib/mysql
sudo apt-get remove --purge mysql-server
sudo apt-get autoremove
sudo apt-get update && sudo apt-get upgrade
sudo apt-get install mysql-server
```

It should be working now.

Now to actually setup the DOMJudge database:

```bash
cd ~/domjudge/domserver/bin
sudo ./dj_setup_database install
```

If you get a permission error, then SQL might have been already installed and needs a fresh install. Go back and fully reinstall SQL. [This is really helpful!](https://www.baeldung.com/linux/mysql-complete-clean-reinstall)

## Webserver

This is basically all from the docs and works by itself.

> [!NOTE]
> The php version will probably change in the future. You are going to have to change to your version

> [!CAUTION]
> If you receieve a Permissions Error (probably for ln or a2enmod), add a `sudo` to the beginning of the command.

```bash
ln -s ~/domjudge/domserver/etc/apache.conf /etc/apache2/conf-available/domjudge.conf
ln -s ~/domjudge/domserver/etc/domjudge-fpm.conf /etc/php/8.1/fpm/pool.d/domjudge.conf
a2enmod proxy_fcgi setenvif rewrite
a2enconf php8.1-fpm domjudge
sudo systemctl reload php8.1-fpm
sudo systemctl reload apache2
```

Now your webserver should be working. Put in the public IP address to the server into the search bar (http not https). The public IP by itself should show a "It's working page" from apache. Now lookup: `http://public_ip/domjudge`.

> [!WARNING]
> If you get an error page (Forbidden), first check the error logs with:

```bash
sudo tail -f /var/log/apache2/error.log
```

I had a permission error and this is what worked for me.

```bash
# chmod +x /home/<USERNAME>
# sudo chmod +x /home/
# sudo chmod +x /home/ubuntu/
# sudo chmod +x /home/ubuntu/__everything_in_between_too__/public/
chmod +x /home/ubuntu
```

Now, you should be able to see the DOMJudge website with a login (`http://public_ip/domjudge`). The admin username is `admin` and the password is located in: `~/domjudge/domserver/etc/initial_admin_password.secret`. If you can't see the DOMJudge webserver, something has gone wrong 😧.

# Installing DOMJudge Judges

This following code will assume that the judges will be on another AWS EC2 instance. This is just good practice.

## Update Server

```bash
sudo apt update
sudo apt upgrade
```

## Dependencies

```bash
sudo apt install gcc g++ make cmake zip unzip debootstrap \
    acl zip unzip mariadb-server apache2 php php-fpm \
    php-gd php-cli php-intl php-mbstring php-mysql \
    php-curl php-json php-xml php-zip composer ntp \
    autoconf automake bats python3-sphinx \
    python3-sphinx-rtd-theme rst2pdf fontconfig \
    python3-yaml latexmk texlive-latex-recommended \
    texlive-latex-extra tex-gyre make pkg-config sudo \
    debootstrap libcgroup-dev php-cli php-curl php-json \
    php-xml php-zip lsof procps

sudo apt remove apport
```

> [!CAUTION]
> Make sure to uninstall the `apport` package. This will conflict with the judgehosts ability to judge submissions. `sudo apt remove apport`

## Download DOMJudge 8.2.2

Again, I am using DOMJudge 8.2.2 and if you are using a different release, then the next few lines will be unique to you.

```bash
wget https://www.domjudge.org/releases/domjudge-8.2.2.tar.gz
tar -xf domjudge-8.2.2.tar.gz
```

Go into to the `~/domjudge-8.2.2` to build the judgehosts

```bash
cd ~/domjudge-8.2.2
make dist
./configure --prefix=$HOME/domjudge
make judgehost
sudo make install-judgehost
```

## Hyperthreading?

Check for hyperthreading capabilities

```bash
lscpu | grep "Thread(s) per core"
# or
cat /sys/devices/system/cpu/smt/active
```

If you have a value of 1 or above, it is possible. It is really nice to run multiple judges on one machine. I do not have this ability (because of free tier) so I will not do the hyperthreading stuff. If you are, check out the DOMJudge docs and good luck to you 😄

## Setting Up CGroups

The CGroups are used for security reasons. I do not think that you have to install them but I highly recommend that you do just to be safe.

Add `quiet cgroup_enable=memory swapaccount=1` to the end of `GRUB_CMDLINE_LINUX_DEFAULT`

```bash
sudo vi /etc/default/grub.d/50-cloudimg-settings.cfg

# In line 11 (probably), append the following
GRUB_CMDLINE_LINUX_DEFAULT="~~existing stuff~~ quiet cgroup_enable=memory swapaccount=1"
```

> [!IMPORTANT]
> According to the documentation, it will have you edit the `/etc/default/grub`. If you are running on your own hardware, that is fine but if you are using AWS, please do not do this. It will be overwritten by `/etc/default/grub.d/50-cloudimg-settings.cfg`.

> [!WARNING]
> If you are using a system that uses cgroups v2 by default (like I Ubuntu AWS), you need to add `systemd.unified_cgroup_hierarchy=0` to the `GRUB_CMDLINE_LINUX_DEFAULT`. This will force cgroups v1 which is what DOMJudge likes. This would look like:

```bash
sudo vi /etc/default/grub.d/50-cloudimg-settings.cfg

# In line 11 (probably), append the following
GRUB_CMDLINE_LINUX_DEFAULT="~~existing stuff~~ quiet cgroup_enable=memory swapaccount=1 systemd.unified_cgroup_hierarchy=0"
```

Update change the changes. You will be kicked out of the SSH and will have to wait a bit until the reboot is complete.

```bash
sudo update-grub
sudo reboot
```

After the reboot, ssh back into the EC2 with the instructions above.

> [!WARNING]
> All of the parameters that you just added should be visible after running `cat /proc/cmdline`. If you don't see everything character for character, then something is wrong.

## Update Judge Permissions

The judge will need certain permissions in order to create the CGroups and run submission code. You can give the judge these required permissions by moving an already created DOMJudge sudoers file.

```bash
# In the etc file directory
cd ~/domjudge/judgehost/etc
sudo cp sudoers-domjudge /etc/sudoers.d/
```

> [!IMPORTANT]
> If you installed in the home directory (like directed in this guide), then you need to run:

```bash
# Specific to installing in the home directory
chmod +rx /home/ubuntu
```

## Creating The CGroups

```bash
# In the bin file directory
cd ~/domjudge/judgehost/bin
sudo groupadd domjudge-run
sudo useradd -g domjudge-run -M -s /bin/false domjudge-run
sudo systemctl enable create-cgroups --now
sudo ./dj_make_chroot
```

## Connecting To The Server

For this next section, you will make sure that the `restapi.secret` on both the DOM Server EC2 and DOM Judge match with the goal of connecting the Judge EC2 to the Server EC2. The sever should tell the judge what user submission to judge as correct or incorrect.

You have to go into the actual server UI in order to make sure that your judgehost user and password are set. Go to the domserver_public_ip/domjudge/ in a web browser and login as the admin (credintials are located in the DOM Server EC2: `~/domjudge/domserver/etc/initial_admin_password.secret`).

Now you'll see a bunch of links to important places. Under Before Contest, go to the Users and then to the judgehost user. I was having trouble with this for a while. You need to edit the judgehost user and manually set the password. I think that it should be automatic but manually setting it worked for me. You need to manually set this judgehost's user password as the randomly generated one in the DOM Judge EC2 (`~/domjudge/judgehost/etc/restapi.secret`).

## Running The Judge

```bash
# In the bin file directory
cd ~/domjudge/judgehost/bin
./judgedaemon
```

And that should be everything. You should have no internal errors (except maybe the configuration) and everything should work as needed ❤️

If your judge does not connect to the DOM Server under the Judgehosts tab, then something is wrong with the `restapi.secret` on the judgehost server. Redo the Connecting To The Server section of this guide.

# Running Contests

This guide is designed to install and setup the basics for the DOMJudge server so I won't go in depth on how to make a contest or problems. Everything is pretty straightforward and accessible on that admin dashboard page! Good luck 😄

# References

Here are good places to look if you are looking to do something more specific or are in need of help I don't have.

- The [DomJudge Manual](https://www.domjudge.org/docs/manual/8.2/index.html) for the **official** documentation
- The DOMJudge [Slack Group](https://domjudge-org.slack.com/). This is an underrated resource! Solved all of the problems that aren't solved directly in the Docs or GitHub Issues. I highly suggest looking through or chatting with someone about an issue you can't find in the docs.
- The [DomJudge Website](https://www.domjudge.org/) (where I got all these good resources)

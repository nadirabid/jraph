#!/usr/local/bin/python

import os
import subprocess
from git import Repo

print "Cloning repository..."

target_dir = "hypergraph"

Repo.clone_from("git@github.com:nadirabid/hypergraph.git", target_dir)

print "Building project..."

os.chdir(target_dir)

print subprocess.Popen(".activator -J-Xms256m -J-Xmx256m clean stage", shell=True, stdout=subprocess.PIPE).stdout.read()

os.chdir("..")

print "Finished"
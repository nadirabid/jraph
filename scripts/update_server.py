#!/usr/local/bin/python

import os
import subprocess
from git import Repo
from git.remote import RemoteProgress

class Progress(RemoteProgress):
    def line_dropped(self, line):
        print line
    def update(self, *args):
        print self._cur_line

print "\n ### Cloning repository..."

target_dir = "hypergraph"

Repo.clone_from("git@github.com:nadirabid/hypergraph.git", target_dir, progress=Progress())

print "\n ### Building project..."

os.chdir(target_dir)

print subprocess.Popen("./activator -J-Xms256m -J-Xmx256m clean stage", shell=True, stdout=subprocess.PIPE).stdout.read()

os.chdir("..")

print "\n ### Finished"
#!/bin/bash
node unlisted/_publicIndexCreator.js

git add --all .
git commit -m ":star: A commit :star:"
git push

# numcommits=$(git rev-list --count master)

# if [ "$numcommits" -gt "5" ]; then
#     git checkout -b temp
#     git checkout master
#     git reset --hard HEAD~4
#     git reset HEAD~1
#     git add .
#     git commit --amend -m "A black hole commit."
#     git cherry-pick temp~3
#     git cherry-pick temp~2
#     git cherry-pick temp~1
#     git cherry-pick temp
#     git branch -D temp
# fi

#!/usr/bin/env node

import ghpages from 'gh-pages';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

ghpages.publish(
  path.join(__dirname, '../dist'),
  {
    dotfiles: true,
    force: true,
  },
  (err) => {
    if (err) {
      console.error('Deploy failed:', err);
      process.exit(1);
    }
    console.log('Published');
  }
);

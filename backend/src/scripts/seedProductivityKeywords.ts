import mongoose from 'mongoose';
import { Tenant } from '../modules/tenant/tenant.model';
import { ProductivityKeyword } from '../modules/productivity/productivity.model';
import { config } from '../config';

// ============================================================
// Default productivity keywords seed data
// ============================================================
interface KeywordEntry {
  keyword: string;
  type: 'app' | 'url' | 'window_title';
  matchType: 'exact' | 'contains' | 'regex';
  priority: number;
}

const PRODUCTIVITY_KEYWORDS: Record<string, KeywordEntry[]> = {
  productive: [
    { keyword: 'vs code', type: 'app', matchType: 'contains', priority: 9 },
    { keyword: 'visual studio code', type: 'app', matchType: 'contains', priority: 9 },
    { keyword: 'sublime text', type: 'app', matchType: 'contains', priority: 9 },
    { keyword: 'visual studio', type: 'app', matchType: 'contains', priority: 9 },
    { keyword: 'intellij', type: 'app', matchType: 'contains', priority: 9 },
    { keyword: 'webstorm', type: 'app', matchType: 'contains', priority: 9 },
    { keyword: 'pycharm', type: 'app', matchType: 'contains', priority: 9 },
    { keyword: 'android studio', type: 'app', matchType: 'contains', priority: 9 },
    { keyword: 'xcode', type: 'app', matchType: 'contains', priority: 9 },
    { keyword: 'github.com', type: 'url', matchType: 'contains', priority: 8 },
    { keyword: 'gitlab.com', type: 'url', matchType: 'contains', priority: 8 },
    { keyword: 'bitbucket.org', type: 'url', matchType: 'contains', priority: 8 },
    { keyword: 'jira', type: 'url', matchType: 'contains', priority: 8 },
    { keyword: 'confluence', type: 'url', matchType: 'contains', priority: 7 },
    { keyword: 'slack', type: 'app', matchType: 'contains', priority: 6 },
    { keyword: 'slack.com', type: 'url', matchType: 'contains', priority: 6 },
    { keyword: 'gmail.com', type: 'url', matchType: 'contains', priority: 5 },
    { keyword: 'outlook', type: 'app', matchType: 'contains', priority: 5 },
    { keyword: 'outlook.com', type: 'url', matchType: 'contains', priority: 5 },
    { keyword: 'docs.google.com', type: 'url', matchType: 'contains', priority: 7 },
    { keyword: 'sheets.google.com', type: 'url', matchType: 'contains', priority: 7 },
    { keyword: 'slides.google.com', type: 'url', matchType: 'contains', priority: 6 },
    { keyword: 'notion.so', type: 'url', matchType: 'contains', priority: 7 },
    { keyword: 'figma.com', type: 'url', matchType: 'contains', priority: 8 },
    { keyword: 'figma', type: 'app', matchType: 'contains', priority: 8 },
    { keyword: 'zoom', type: 'app', matchType: 'contains', priority: 7 },
    { keyword: 'zoom.us', type: 'url', matchType: 'contains', priority: 7 },
    { keyword: 'meet.google.com', type: 'url', matchType: 'contains', priority: 7 },
    { keyword: 'teams', type: 'app', matchType: 'contains', priority: 7 },
    { keyword: 'teams.microsoft.com', type: 'url', matchType: 'contains', priority: 7 },
    { keyword: 'excel', type: 'app', matchType: 'contains', priority: 6 },
    { keyword: 'word', type: 'app', matchType: 'contains', priority: 6 },
    { keyword: 'powerpoint', type: 'app', matchType: 'contains', priority: 6 },
    { keyword: 'stackoverflow.com', type: 'url', matchType: 'contains', priority: 7 },
    { keyword: 'linear.app', type: 'url', matchType: 'contains', priority: 8 },
    { keyword: 'asana.com', type: 'url', matchType: 'contains', priority: 7 },
    { keyword: 'trello.com', type: 'url', matchType: 'contains', priority: 7 },
    { keyword: 'postman', type: 'app', matchType: 'contains', priority: 7 },
    { keyword: 'insomnia', type: 'app', matchType: 'contains', priority: 7 },
    { keyword: 'terminal', type: 'app', matchType: 'contains', priority: 8 },
    { keyword: 'powershell', type: 'app', matchType: 'contains', priority: 8 },
    { keyword: 'cmd.exe', type: 'app', matchType: 'contains', priority: 7 },
    { keyword: 'iterm', type: 'app', matchType: 'contains', priority: 8 },
  ],
  neutral: [
    { keyword: 'chrome', type: 'app', matchType: 'contains', priority: 3 },
    { keyword: 'firefox', type: 'app', matchType: 'contains', priority: 3 },
    { keyword: 'safari', type: 'app', matchType: 'contains', priority: 3 },
    { keyword: 'edge', type: 'app', matchType: 'contains', priority: 3 },
    { keyword: 'google.com', type: 'url', matchType: 'contains', priority: 2 },
    { keyword: 'wikipedia.org', type: 'url', matchType: 'contains', priority: 3 },
    { keyword: 'discord', type: 'app', matchType: 'contains', priority: 4 },
    { keyword: 'discord.com', type: 'url', matchType: 'contains', priority: 4 },
    { keyword: 'telegram', type: 'app', matchType: 'contains', priority: 4 },
    { keyword: 'whatsapp', type: 'app', matchType: 'contains', priority: 4 },
    { keyword: 'notepad', type: 'app', matchType: 'contains', priority: 3 },
    { keyword: 'calculator', type: 'app', matchType: 'contains', priority: 2 },
  ],
  unproductive: [
    { keyword: 'youtube.com', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'facebook.com', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'instagram.com', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'twitter.com', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'x.com', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'tiktok.com', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'reddit.com', type: 'url', matchType: 'contains', priority: 9 },
    { keyword: 'netflix.com', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'netflix', type: 'app', matchType: 'contains', priority: 10 },
    { keyword: 'primevideo.com', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'hotstar.com', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'twitch.tv', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'steam', type: 'app', matchType: 'contains', priority: 10 },
    { keyword: 'store.steampowered.com', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'epicgames.com', type: 'url', matchType: 'contains', priority: 10 },
    { keyword: 'fortnite', type: 'app', matchType: 'contains', priority: 10 },
    { keyword: 'spotify.com', type: 'url', matchType: 'contains', priority: 7 },
    { keyword: 'spotify', type: 'app', matchType: 'contains', priority: 7 },
    { keyword: 'snapchat.com', type: 'url', matchType: 'contains', priority: 9 },
    { keyword: 'pinterest.com', type: 'url', matchType: 'contains', priority: 8 },
  ],
};

async function seedProductivityKeywords() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB');

    // Get first active tenant (seed for all tenants or just one)
    const tenants = await Tenant.find({ status: 'active' });

    if (tenants.length === 0) {
      console.log('⚠️  No active tenants found. Run `npm run seed` first to create tenants.');
      process.exit(1);
    }

    for (const tenant of tenants) {
      console.log(`\n📦 Seeding keywords for tenant: ${tenant.name} (${tenant._id})`);

      // Clear existing keywords for this tenant
      const deleted = await ProductivityKeyword.deleteMany({ tenantId: tenant._id });
      if (deleted.deletedCount > 0) {
        console.log(`   🗑️  Cleared ${deleted.deletedCount} existing keywords`);
      }

      let total = 0;

      // Seed by category
      for (const [category, keywords] of Object.entries(PRODUCTIVITY_KEYWORDS)) {
        const docs = keywords.map((kw) => ({
          ...kw,
          tenantId: tenant._id,
          category: category as 'productive' | 'neutral' | 'unproductive',
          enabled: true,
        }));

        const created = await ProductivityKeyword.insertMany(docs);
        console.log(`   ✅ Created ${created.length} "${category}" keywords`);
        total += created.length;
      }

      console.log(`   🎉 Total keywords seeded for ${tenant.name}: ${total}`);
    }

    console.log('\n✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedProductivityKeywords();

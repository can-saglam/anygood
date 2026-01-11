#!/usr/bin/env node

/**
 * Notion to Supabase Sync Script
 * 
 * This script syncs curated content from a Notion database to Supabase.
 * Run this locally or set up as a GitHub Action to run daily.
 * 
 * Setup:
 * 1. npm install @notionhq/client @supabase/supabase-js dotenv
 * 2. Create a .env file with your credentials (see .env.example)
 * 3. Run: node notion-sync.js
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const { createClient } = require('@supabase/supabase-js');

// Initialize clients
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for admin access
);

// Configuration
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

/**
 * Extract text from Notion rich text object
 */
function extractText(richText) {
  if (!richText || !richText.length) return null;
  return richText.map(text => text.plain_text).join('');
}

/**
 * Extract select value from Notion select property
 */
function extractSelect(select) {
  return select?.name || null;
}

/**
 * Extract URL from Notion URL property
 */
function extractURL(url) {
  return url || null;
}

/**
 * Extract number from Notion number property
 */
function extractNumber(number) {
  return number ?? 0;
}

/**
 * Extract checkbox value from Notion checkbox property
 */
function extractCheckbox(checkbox) {
  return checkbox === true;
}

/**
 * Fetch all published items from Notion
 */
async function fetchNotionItems() {
  console.log('Fetching items from Notion...');
  
  try {
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter: {
        property: 'Published',
        checkbox: { equals: true }
      },
      sorts: [
        {
          property: 'Priority',
          direction: 'descending'
        }
      ]
    });

    console.log(`Found ${response.results.length} published items in Notion`);
    return response.results;
  } catch (error) {
    console.error('Error fetching from Notion:', error.message);
    throw error;
  }
}

/**
 * Transform Notion page to Supabase format
 */
function transformNotionToSupabase(page) {
  const props = page.properties;
  
  // Map Notion property names to your database structure
  // Adjust these based on your actual Notion database column names
  const category = extractSelect(props.Category?.select)?.toLowerCase();
  const title = extractText(props.Title?.title || props.Name?.title);
  const description = extractText(props.Description?.rich_text);
  const link = extractURL(props.Link?.url);
  const imageUrl = extractURL(props.Image?.url || props['Image URL']?.url);
  const author = extractText(props.Author?.rich_text);
  const curatorNote = extractText(props['Curator Note']?.rich_text || props.Note?.rich_text);
  const priority = extractNumber(props.Priority?.number);
  const isPublished = extractCheckbox(props.Published?.checkbox);
  
  // Extract tags if available
  let tags = null;
  if (props.Tags?.multi_select) {
    tags = props.Tags.multi_select.map(tag => tag.name);
  }
  
  return {
    id: page.id, // Use Notion page ID as UUID
    category,
    title,
    description,
    link,
    image_url: imageUrl,
    author,
    curator_note: curatorNote,
    tags,
    priority,
    is_published: isPublished,
    published_at: page.created_time,
    updated_at: page.last_edited_time
  };
}

/**
 * Sync items to Supabase
 */
async function syncToSupabase(items) {
  console.log(`Syncing ${items.length} items to Supabase...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const page of items) {
    try {
      const data = transformNotionToSupabase(page);
      
      // Validate required fields
      if (!data.category || !data.title) {
        console.warn(`Skipping item ${page.id}: missing category or title`);
        errorCount++;
        continue;
      }
      
      // Validate category
      const validCategories = ['read', 'listen', 'watch', 'eat', 'do'];
      if (!validCategories.includes(data.category)) {
        console.warn(`Skipping item ${page.id}: invalid category "${data.category}"`);
        errorCount++;
        continue;
      }
      
      // Upsert to Supabase (insert or update if exists)
      const { error } = await supabase
        .from('curated_picks')
        .upsert(data, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`Error upserting item ${data.title}:`, error.message);
        errorCount++;
      } else {
        console.log(`✓ Synced: ${data.title} (${data.category})`);
        successCount++;
      }
    } catch (error) {
      console.error(`Error processing item:`, error.message);
      errorCount++;
    }
  }
  
  return { successCount, errorCount };
}

/**
 * Clean up items that were unpublished in Notion
 */
async function cleanupUnpublishedItems(notionIds) {
  console.log('Cleaning up unpublished items...');
  
  try {
    // Get all items from Supabase
    const { data: allItems, error: fetchError } = await supabase
      .from('curated_picks')
      .select('id');
    
    if (fetchError) {
      console.error('Error fetching items from Supabase:', fetchError.message);
      return;
    }
    
    // Find items in Supabase that are no longer in Notion
    const notionIdSet = new Set(notionIds);
    const itemsToUnpublish = allItems.filter(item => !notionIdSet.has(item.id));
    
    if (itemsToUnpublish.length === 0) {
      console.log('No items to unpublish');
      return;
    }
    
    console.log(`Unpublishing ${itemsToUnpublish.length} items...`);
    
    // Unpublish items instead of deleting (safer)
    for (const item of itemsToUnpublish) {
      const { error } = await supabase
        .from('curated_picks')
        .update({ is_published: false })
        .eq('id', item.id);
      
      if (error) {
        console.error(`Error unpublishing item ${item.id}:`, error.message);
      } else {
        console.log(`✓ Unpublished item ${item.id}`);
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

/**
 * Main sync function
 */
async function main() {
  console.log('='.repeat(50));
  console.log('Notion → Supabase Sync');
  console.log('='.repeat(50));
  console.log();
  
  try {
    // Fetch from Notion
    const notionItems = await fetchNotionItems();
    
    if (notionItems.length === 0) {
      console.log('No published items found in Notion');
      return;
    }
    
    // Sync to Supabase
    const { successCount, errorCount } = await syncToSupabase(notionItems);
    
    // Cleanup unpublished items
    const notionIds = notionItems.map(item => item.id);
    await cleanupUnpublishedItems(notionIds);
    
    // Summary
    console.log();
    console.log('='.repeat(50));
    console.log('Sync Complete!');
    console.log('='.repeat(50));
    console.log(`✓ Success: ${successCount} items`);
    console.log(`✗ Errors: ${errorCount} items`);
    console.log();
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the sync
main();

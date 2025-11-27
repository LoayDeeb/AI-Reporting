#!/usr/bin/env python3
"""
Chunk the large Zainjo JSON file using ijson for incremental parsing
"""
import ijson
import json
import os
import sys
from pathlib import Path
from datetime import datetime

def chunk_zainjo_with_ijson():
    print("🔧 Chunking large Zainjo file with ijson...\n")
    
    # File paths
    script_dir = Path(__file__).parent
    source_file = script_dir / "data" / "Zainjo.json"
    output_dir = script_dir / "data" / "zainjo-chunks"
    
    # Create output directory
    output_dir.mkdir(exist_ok=True)
    
    try:
        # Get file size
        file_size_mb = source_file.stat().st_size / (1024 * 1024)
        print(f"📁 Source file: {file_size_mb:.1f}MB")
        
        # Configuration
        max_chatters_per_chunk = 500
        current_chunk = 0
        chatters_processed = 0
        current_chunk_data = []
        
        print("🔍 Starting ijson incremental parsing...")
        
        # Open file and parse incrementally
        with open(source_file, 'rb') as file:
            # Parse the ActiveChatters array incrementally
            parser = ijson.items(file, 'ActiveChatters.item')
            
            for chatter in parser:
                # Validate chatter has required fields
                if chatter.get('SenderID') and chatter.get('ChatHistory'):
                    current_chunk_data.append(chatter)
                    chatters_processed += 1
                    
                    if chatters_processed % 1000 == 0:
                        print(f"📊 Processed {chatters_processed} chatters...")
                    
                    if len(current_chunk_data) >= max_chatters_per_chunk:
                        # Save chunk
                        save_chunk(output_dir, current_chunk, current_chunk_data)
                        current_chunk += 1
                        current_chunk_data = []
        
        # Save remaining data
        if current_chunk_data:
            save_chunk(output_dir, current_chunk, current_chunk_data)
            current_chunk += 1
        
        print(f"\n✅ Processing completed!")
        print(f"   - Total chatters processed: {chatters_processed}")
        print(f"   - Chunks created: {current_chunk}")
        print(f"   - Output directory: {output_dir}")
        
        # Create summary file
        summary = {
            "totalChatters": chatters_processed,
            "totalChunks": current_chunk,
            "maxChattersPerChunk": max_chatters_per_chunk,
            "timestamp": datetime.now().isoformat(),
            "sourceFile": str(source_file),
            "sourceFileSizeMB": round(file_size_mb, 1),
            "parsingMethod": "ijson_incremental"
        }
        
        summary_file = output_dir / "chunking-summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        print(f"📋 Summary saved to chunking-summary.json")
        
        # Verify first chunk
        if current_chunk > 0:
            first_chunk_path = output_dir / "zainjo-chunk-000.json"
            if first_chunk_path.exists():
                with open(first_chunk_path, 'r', encoding='utf-8') as f:
                    first_chunk = json.load(f)
                
                print(f"\n🔍 First chunk verification:")
                print(f"   - Chatters in first chunk: {first_chunk['totalChatters']}")
                if first_chunk['chatters']:
                    first_chatter = first_chunk['chatters'][0]
                    print(f"   - First chatter SenderID: {first_chatter.get('SenderID')}")
                    print(f"   - First chatter messages: {len(first_chatter.get('ChatHistory', []))}")
                    
                    # Show sample message
                    if first_chatter.get('ChatHistory'):
                        sample_msg = first_chatter['ChatHistory'][0]
                        print(f"   - Sample message: {sample_msg.get('MessageText', '')[:50]}...")
        
        return True
        
    except Exception as error:
        print(f"❌ Error: {error}")
        import traceback
        traceback.print_exc()
        return False

def save_chunk(output_dir, chunk_number, chatters):
    filename = f"zainjo-chunk-{chunk_number:03d}.json"
    filepath = output_dir / filename
    
    chunk_data = {
        "chunkNumber": chunk_number,
        "totalChatters": len(chatters),
        "chatters": chatters
    }
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(chunk_data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Saved chunk {chunk_number}: {len(chatters)} chatters -> {filename}")

if __name__ == "__main__":
    success = chunk_zainjo_with_ijson()
    if success:
        print(f"\n🎉 Chunking completed successfully!")
        print(f"💡 You can now analyze the chunked data with the Zainjo API")
    else:
        print(f"\n❌ Chunking failed!")
        sys.exit(1) 
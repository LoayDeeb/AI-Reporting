#!/usr/bin/env python3
"""
Large JSON File Chunker - ijson Version
Efficiently chunks very large JSON files using ijson streaming parser.
"""

import json
import os
import sys
from pathlib import Path
import time
from typing import List, Dict, Any
import subprocess

try:
    import ijson
except ImportError:
    print("❌ ijson library not found. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "ijson"])
    import ijson

class LargeJSONChunkerIjson:
    def __init__(self, input_file: str, chunk_size_mb: int = 100):
        self.input_file = input_file
        self.chunk_size_mb = chunk_size_mb
        self.chunk_size_bytes = chunk_size_mb * 1024 * 1024
        
        self.data_dir = Path(__file__).parent / "data"
        self.chunks_dir = self.data_dir / "chunks"
        
        self.current_chunk = []
        self.current_chunk_size = 0
        self.chunk_index = 0
        self.total_conversations = 0
        self.chunks = []
        
    def chunk_file(self):
        print("🚀 Starting ijson Large File Chunking Process")
        print(f"📁 Input file: {self.input_file}")
        print(f"📊 Target chunk size: {self.chunk_size_mb}MB")
        
        # Create chunks directory
        self.chunks_dir.mkdir(parents=True, exist_ok=True)
        print(f"📂 Created chunks directory: {self.chunks_dir}")
        
        input_path = self.data_dir / self.input_file
        
        if not input_path.exists():
            raise FileNotFoundError(f"❌ File not found: {input_path}")
        
        file_size_gb = input_path.stat().st_size / (1024 * 1024 * 1024)
        print(f"📏 File size: {file_size_gb:.2f}GB ({input_path.stat().st_size} bytes)")
        
        print("📖 Starting ijson streaming JSON processing...")
        start_time = time.time()
        
        try:
            self._process_file_with_ijson(input_path)
            
            # Save final chunk
            if self.current_chunk:
                self._save_chunk(self.current_chunk, self.chunk_index, self.current_chunk_size)
                self.chunks.append({
                    'index': self.chunk_index,
                    'conversations': len(self.current_chunk),
                    'sizeMB': round(self.current_chunk_size / (1024 * 1024), 2)
                })
            
            # Generate summary
            self._generate_summary(self.chunks, self.total_conversations, file_size_gb)
            
            processing_time = time.time() - start_time
            print(f"✅ Processing completed in {processing_time:.2f}s")
            print("🎉 Chunking completed successfully!")
            
            return self.chunks
            
        except Exception as e:
            print(f"❌ Error during processing: {e}")
            raise
    
    def _process_file_with_ijson(self, input_path: Path):
        """Process file using ijson streaming parser"""
        with open(input_path, 'rb') as file:
            # Parse each object in the JSON array
            parser = ijson.parse(file)
            
            current_object = {}
            current_path = []
            object_depth = 0
            in_array = False
            
            for prefix, event, value in parser:
                # Track progress
                if self.total_conversations % 1000 == 0 and event == 'end_map':
                    print(f"⏳ Processed: {self.total_conversations:,} conversations")
                
                # Handle array start
                if prefix == '' and event == 'start_array':
                    in_array = True
                    continue
                
                # Handle array end
                if prefix == '' and event == 'end_array':
                    break
                
                # Handle object in array
                if in_array and event == 'start_map' and prefix.count('.') == 0:
                    current_object = {}
                    object_depth = 0
                    
                elif in_array and event == 'end_map' and prefix.count('.') == 0:
                    # We have a complete conversation object
                    if current_object:
                        self._add_conversation_to_chunk(current_object)
                    current_object = {}
                    
                elif in_array and prefix.count('.') >= 0:
                    # Build the object structure
                    self._build_object_from_ijson_event(current_object, prefix, event, value)
    
    def _build_object_from_ijson_event(self, obj: Dict, prefix: str, event: str, value: Any):
        """Build object structure from ijson events"""
        if not prefix or prefix.startswith('item.'):
            # Remove 'item.' prefix if present
            path = prefix.replace('item.', '') if prefix.startswith('item.') else prefix
            
            if event in ('string', 'number', 'boolean', 'null'):
                self._set_nested_value(obj, path, value)
            elif event == 'start_map':
                if path:
                    self._set_nested_value(obj, path, {})
            elif event == 'start_array':
                if path:
                    self._set_nested_value(obj, path, [])
    
    def _set_nested_value(self, obj: Dict, path: str, value: Any):
        """Set nested value in object using dot notation path"""
        if not path:
            return
            
        keys = path.split('.')
        current = obj
        
        # Navigate to the parent of the target key
        for key in keys[:-1]:
            if key.isdigit():
                key = int(key)
                # Ensure list exists and is long enough
                if not isinstance(current, list):
                    return
                while len(current) <= key:
                    current.append({})
                current = current[key]
            else:
                if key not in current:
                    current[key] = {}
                current = current[key]
        
        # Set the final value
        final_key = keys[-1]
        if final_key.isdigit():
            final_key = int(final_key)
            if isinstance(current, list):
                while len(current) <= final_key:
                    current.append(None)
                current[final_key] = value
        else:
            current[final_key] = value
    
    def _add_conversation_to_chunk(self, conversation: Dict[Any, Any]):
        """Add conversation to current chunk, creating new chunk if size limit exceeded"""
        conversation_str = json.dumps(conversation, ensure_ascii=False)
        conversation_size = len(conversation_str.encode('utf-8'))
        
        # Check if adding this conversation would exceed chunk size
        if (self.current_chunk_size + conversation_size > self.chunk_size_bytes and 
            len(self.current_chunk) > 0):
            
            # Save current chunk
            self._save_chunk(self.current_chunk, self.chunk_index, self.current_chunk_size)
            self.chunks.append({
                'index': self.chunk_index,
                'conversations': len(self.current_chunk),
                'sizeMB': round(self.current_chunk_size / (1024 * 1024), 2)
            })
            
            # Start new chunk
            self.current_chunk = []
            self.current_chunk_size = 0
            self.chunk_index += 1
        
        self.current_chunk.append(conversation)
        self.current_chunk_size += conversation_size
        self.total_conversations += 1
    
    def _save_chunk(self, chunk_data: List[Dict], index: int, size: int):
        """Save chunk to file"""
        chunk_filename = f"conversations_chunk_{index:03d}.json"
        chunk_path = self.chunks_dir / chunk_filename
        
        with open(chunk_path, 'w', encoding='utf-8') as f:
            json.dump(chunk_data, f, indent=2, ensure_ascii=False)
        
        size_mb = size / (1024 * 1024)
        print(f"💾 Saved chunk {index}: {chunk_filename} ({len(chunk_data)} conversations, {size_mb:.2f}MB)")
    
    def _generate_summary(self, chunks: List[Dict], total_conversations: int, original_size_gb: float):
        """Generate and save chunking summary"""
        summary_path = self.chunks_dir / "chunking_summary.json"
        
        summary = {
            'originalFile': self.input_file,
            'originalSizeGB': round(original_size_gb, 2),
            'totalConversations': total_conversations,
            'totalChunks': len(chunks),
            'targetChunkSizeMB': self.chunk_size_mb,
            'chunks': chunks,
            'createdAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
            'processingStats': {
                'averageConversationsPerChunk': round(total_conversations / len(chunks)) if chunks else 0,
                'averageChunkSizeMB': round(sum(chunk['sizeMB'] for chunk in chunks) / len(chunks), 2) if chunks else 0,
                'estimatedProcessingTimeHours': round(len(chunks) * 1.1, 1),  # 66 minutes per chunk
                'estimatedAPICostUSD': f"${len(chunks) * 2.5:.0f}-{len(chunks) * 5:.0f}"
            }
        }
        
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print('\n📊 CHUNKING SUMMARY:')
        print(f"📁 Original file: {self.input_file} ({original_size_gb:.2f}GB)")
        print(f"🔢 Total conversations: {total_conversations:,}")
        print(f"📦 Total chunks created: {len(chunks)}")
        print(f"⏱️  Estimated processing time: {summary['processingStats']['estimatedProcessingTimeHours']} hours")
        print(f"💰 Estimated API cost: {summary['processingStats']['estimatedAPICostUSD']}")
        print(f"📄 Summary saved: {summary_path}")
        
        print('\n📦 CHUNK DETAILS:')
        for chunk in chunks:
            print(f"  Chunk {chunk['index']}: {chunk['conversations']} conversations ({chunk['sizeMB']}MB)")


# Alternative simpler approach using ijson.items()
class SimpleIjsonChunker:
    def __init__(self, input_file: str, chunk_size_mb: int = 100):
        self.input_file = input_file
        self.chunk_size_mb = chunk_size_mb
        self.chunk_size_bytes = chunk_size_mb * 1024 * 1024
        
        self.data_dir = Path(__file__).parent / "data"
        self.chunks_dir = self.data_dir / "chunks"
        
    def chunk_file_simple(self):
        print("🚀 Starting Simple ijson Chunking Process")
        print(f"📁 Input file: {self.input_file}")
        print(f"📊 Target chunk size: {self.chunk_size_mb}MB")
        
        # Create chunks directory
        self.chunks_dir.mkdir(parents=True, exist_ok=True)
        print(f"📂 Created chunks directory: {self.chunks_dir}")
        
        input_path = self.data_dir / self.input_file
        
        if not input_path.exists():
            raise FileNotFoundError(f"❌ File not found: {input_path}")
        
        file_size_gb = input_path.stat().st_size / (1024 * 1024 * 1024)
        print(f"📏 File size: {file_size_gb:.2f}GB ({input_path.stat().st_size} bytes)")
        
        print("📖 Starting simple ijson processing...")
        start_time = time.time()
        
        current_chunk = []
        current_chunk_size = 0
        chunk_index = 0
        total_conversations = 0
        chunks = []
        
        try:
            with open(input_path, 'rb') as file:
                # Use ijson.items to iterate over array items
                conversations = ijson.items(file, 'item')
                
                for conversation in conversations:
                    conversation_str = json.dumps(conversation, ensure_ascii=False)
                    conversation_size = len(conversation_str.encode('utf-8'))
                    
                    # Check if adding this conversation would exceed chunk size
                    if (current_chunk_size + conversation_size > self.chunk_size_bytes and 
                        len(current_chunk) > 0):
                        
                        # Save current chunk
                        self._save_chunk(current_chunk, chunk_index, current_chunk_size)
                        chunks.append({
                            'index': chunk_index,
                            'conversations': len(current_chunk),
                            'sizeMB': round(current_chunk_size / (1024 * 1024), 2)
                        })
                        
                        # Start new chunk
                        current_chunk = []
                        current_chunk_size = 0
                        chunk_index += 1
                    
                    current_chunk.append(conversation)
                    current_chunk_size += conversation_size
                    total_conversations += 1
                    
                    # Progress indicator
                    if total_conversations % 1000 == 0:
                        print(f"⏳ Processed: {total_conversations:,} conversations")
            
            # Save final chunk
            if current_chunk:
                self._save_chunk(current_chunk, chunk_index, current_chunk_size)
                chunks.append({
                    'index': chunk_index,
                    'conversations': len(current_chunk),
                    'sizeMB': round(current_chunk_size / (1024 * 1024), 2)
                })
            
            # Generate summary
            self._generate_summary(chunks, total_conversations, file_size_gb)
            
            processing_time = time.time() - start_time
            print(f"✅ Processing completed in {processing_time:.2f}s")
            print("🎉 Chunking completed successfully!")
            
            return chunks
            
        except Exception as e:
            print(f"❌ Error during processing: {e}")
            raise
    
    def _save_chunk(self, chunk_data: List[Dict], index: int, size: int):
        """Save chunk to file"""
        chunk_filename = f"conversations_chunk_{index:03d}.json"
        chunk_path = self.chunks_dir / chunk_filename
        
        with open(chunk_path, 'w', encoding='utf-8') as f:
            json.dump(chunk_data, f, indent=2, ensure_ascii=False)
        
        size_mb = size / (1024 * 1024)
        print(f"💾 Saved chunk {index}: {chunk_filename} ({len(chunk_data)} conversations, {size_mb:.2f}MB)")
    
    def _generate_summary(self, chunks: List[Dict], total_conversations: int, original_size_gb: float):
        """Generate and save chunking summary"""
        summary_path = self.chunks_dir / "chunking_summary.json"
        
        summary = {
            'originalFile': self.input_file,
            'originalSizeGB': round(original_size_gb, 2),
            'totalConversations': total_conversations,
            'totalChunks': len(chunks),
            'targetChunkSizeMB': self.chunk_size_mb,
            'chunks': chunks,
            'createdAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
            'processingStats': {
                'averageConversationsPerChunk': round(total_conversations / len(chunks)) if chunks else 0,
                'averageChunkSizeMB': round(sum(chunk['sizeMB'] for chunk in chunks) / len(chunks), 2) if chunks else 0,
                'estimatedProcessingTimeHours': round(len(chunks) * 1.1, 1),
                'estimatedAPICostUSD': f"${len(chunks) * 2.5:.0f}-{len(chunks) * 5:.0f}"
            }
        }
        
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print('\n📊 CHUNKING SUMMARY:')
        print(f"📁 Original file: {self.input_file} ({original_size_gb:.2f}GB)")
        print(f"🔢 Total conversations: {total_conversations:,}")
        print(f"📦 Total chunks created: {len(chunks)}")
        print(f"⏱️  Estimated processing time: {summary['processingStats']['estimatedProcessingTimeHours']} hours")
        print(f"💰 Estimated API cost: {summary['processingStats']['estimatedAPICostUSD']}")
        print(f"📄 Summary saved: {summary_path}")
        
        print('\n📦 CHUNK DETAILS:')
        for chunk in chunks:
            print(f"  Chunk {chunk['index']}: {chunk['conversations']} conversations ({chunk['sizeMB']}MB)")


def main():
    if len(sys.argv) < 2:
        print("Usage: python chunk_large_file_ijson.py <filename> [chunk_size_mb] [method]")
        print("Example: python chunk_large_file_ijson.py 0d1d46c3-ea4f-4fa6-b2a0-e58ec3211ce3.json 100 simple")
        print("Methods: simple (recommended), advanced")
        sys.exit(1)
    
    filename = sys.argv[1]
    chunk_size = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    method = sys.argv[3] if len(sys.argv) > 3 else 'simple'
    
    try:
        if method == 'simple':
            chunker = SimpleIjsonChunker(filename, chunk_size)
            chunks = chunker.chunk_file_simple()
        else:
            chunker = LargeJSONChunkerIjson(filename, chunk_size)
            chunks = chunker.chunk_file()
            
        print(f"\n🎉 Successfully created {len(chunks)} chunks using {method} method!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 
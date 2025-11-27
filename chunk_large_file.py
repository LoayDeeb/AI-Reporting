#!/usr/bin/env python3
"""
Large JSON File Chunker - Python Version
Efficiently chunks very large JSON files without loading them entirely into memory.
"""

import json
import os
import sys
from pathlib import Path
import time
from typing import List, Dict, Any

class LargeJSONChunker:
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
        print("🚀 Starting Python Large File Chunking Process")
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
        
        print("📖 Starting streaming JSON processing...")
        start_time = time.time()
        
        try:
            self._process_file_streaming(input_path)
            
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
    
    def _process_file_streaming(self, input_path: Path):
        """Process file using streaming approach with minimal memory usage"""
        buffer = ""
        bracket_depth = 0
        in_array = False
        object_start = -1
        
        with open(input_path, 'r', encoding='utf-8') as file:
            while True:
                # Read in small chunks
                chunk = file.read(64 * 1024)  # 64KB chunks
                if not chunk:
                    break
                
                buffer += chunk
                
                # Process the buffer
                i = 0
                while i < len(buffer):
                    char = buffer[i]
                    
                    if char == '[' and not in_array:
                        in_array = True
                        object_start = i + 1
                    elif char == '{' and in_array:
                        if bracket_depth == 0:
                            object_start = i
                        bracket_depth += 1
                    elif char == '}' and in_array:
                        bracket_depth -= 1
                        
                        if bracket_depth == 0 and object_start != -1:
                            # We have a complete object
                            object_str = buffer[object_start:i + 1]
                            try:
                                conversation = json.loads(object_str)
                                self._add_conversation_to_chunk(conversation, object_str)
                            except json.JSONDecodeError:
                                print(f"⚠️  Skipping malformed JSON object at position {object_start}")
                            object_start = -1
                    
                    i += 1
                
                # Keep only the unprocessed part of the buffer
                if object_start != -1 and object_start > 0:
                    buffer = buffer[object_start:]
                    object_start = 0
                elif bracket_depth == 0 and in_array:
                    # Find the last complete object boundary
                    last_brace = buffer.rfind('}')
                    if last_brace != -1:
                        buffer = buffer[last_brace + 1:]
    
    def _add_conversation_to_chunk(self, conversation: Dict[Any, Any], conversation_str: str):
        """Add conversation to current chunk, creating new chunk if size limit exceeded"""
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
        
        # Progress indicator
        if self.total_conversations % 1000 == 0:
            print(f"⏳ Processed: {self.total_conversations:,} conversations")
    
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


def main():
    if len(sys.argv) < 2:
        print("Usage: python chunk_large_file.py <filename> [chunk_size_mb]")
        print("Example: python chunk_large_file.py 0d1d46c3-ea4f-4fa6-b2a0-e58ec3211ce3.json 100")
        sys.exit(1)
    
    filename = sys.argv[1]
    chunk_size = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    
    try:
        chunker = LargeJSONChunker(filename, chunk_size)
        chunks = chunker.chunk_file()
        print(f"\n🎉 Successfully created {len(chunks)} chunks!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 
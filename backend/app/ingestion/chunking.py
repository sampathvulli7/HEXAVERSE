"""Split extracted units into retrieval-sized chunks.

Chunks never cross unit (= page/block) boundaries, so every chunk maps to
exactly one locator — that's what keeps citations precise. 
This semantic chunker splits text by sentences to ensure context isn't broken
in the middle of a thought, significantly improving LLM retrieval.
"""

import re

MAX_WORDS = 350
OVERLAP_WORDS = 50


def chunk_units(units: list[dict]) -> list[dict]:
    chunks = []
    # Split by common sentence terminators followed by whitespace
    sentence_pattern = re.compile(r'(?<=[.!?])\s+')

    for unit in units:
        text = unit["text"]
        sentences = sentence_pattern.split(text)
        
        current_chunk_sentences = []
        current_word_count = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            sentence_word_count = len(sentence.split())
            
            # If adding this sentence exceeds our budget, flush the current chunk
            if current_word_count + sentence_word_count > MAX_WORDS and current_chunk_sentences:
                chunks.append({
                    "text": " ".join(current_chunk_sentences),
                    "locator": unit["locator"]
                })
                # Create overlap for the next chunk
                overlap_sentences = []
                overlap_word_count = 0
                for s in reversed(current_chunk_sentences):
                    s_words = len(s.split())
                    if overlap_word_count + s_words <= OVERLAP_WORDS:
                        overlap_sentences.insert(0, s)
                        overlap_word_count += s_words
                    else:
                        break
                        
                current_chunk_sentences = overlap_sentences
                current_word_count = overlap_word_count
                
            current_chunk_sentences.append(sentence)
            current_word_count += sentence_word_count
            
        # Flush whatever is left
        if current_chunk_sentences:
            chunks.append({
                "text": " ".join(current_chunk_sentences),
                "locator": unit["locator"]
            })
            
    return chunks

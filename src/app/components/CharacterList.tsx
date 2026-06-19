import { Character, Chapter } from '../App';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { User, BookOpen } from 'lucide-react';

interface CharacterListProps {
  characters: Character[];
  chapters: Chapter[];
  onSelectCharacter: (characterId: string) => void;
}

export function CharacterList({ characters, chapters, onSelectCharacter }: CharacterListProps) {
  const getCharacterAppearances = (characterName: string) => {
    return chapters.filter(chapter => 
      chapter.content.toLowerCase().includes(characterName.toLowerCase())
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {characters.map((character) => {
        const appearances = getCharacterAppearances(character.name);
        
        return (
          <Card 
            key={character.id}
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow bg-white"
            onClick={() => onSelectCharacter(character.id)}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-amber-900 truncate">{character.name}</h3>
                <Badge variant="secondary" className="mt-1 bg-purple-100 text-purple-900">
                  {character.role}
                </Badge>
              </div>
            </div>

            {character.description && (
              <p className="text-amber-700 line-clamp-3 mb-3">
                {character.description}
              </p>
            )}

            <div className="flex items-center gap-2 text-amber-600">
              <BookOpen className="w-4 h-4" />
              <span>
                {appearances.length} {appearances.length === 1 ? 'chapter' : 'chapters'}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

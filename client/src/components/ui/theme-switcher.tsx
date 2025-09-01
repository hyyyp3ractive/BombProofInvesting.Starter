import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUI, THEMES } from "@/contexts/ui-context";

export function ThemeSwitcher() {
  const { currentTheme, setCurrentTheme } = useUI();

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium">Theme</label>
      <Select value={currentTheme} onValueChange={setCurrentTheme}>
        <SelectTrigger className="w-48 bg-card border-border" data-testid="select-theme">
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent className="bg-card/95 backdrop-blur-sm border-border shadow-lg">
          {THEMES.map((theme) => (
            <SelectItem 
              key={theme.id} 
              value={theme.id}
              className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{theme.emoji}</span>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{theme.label}</span>
                  <span className="text-xs text-muted-foreground">{theme.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
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
        <SelectContent className="bg-card border-border">
          {THEMES.map((theme) => (
            <SelectItem 
              key={theme.id} 
              value={theme.id}
              className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>{theme.emoji}</span>
                <span>{theme.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
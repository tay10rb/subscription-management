import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Palette } from "lucide-react"

/**
 * Theme test component to verify dark mode compatibility
 * This component showcases various UI elements in both light and dark themes
 */
export function ThemeTestCard() {
  const { theme } = useTheme()

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Test Card
        </CardTitle>
        <CardDescription>
          Testing UI components in {theme} mode to ensure proper dark theme support
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Palette Test */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Color Variables</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="h-8 bg-primary rounded flex items-center justify-center text-primary-foreground text-xs">
                Primary
              </div>
              <div className="h-8 bg-secondary rounded flex items-center justify-center text-secondary-foreground text-xs">
                Secondary
              </div>
              <div className="h-8 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                Muted
              </div>
              <div className="h-8 bg-accent rounded flex items-center justify-center text-accent-foreground text-xs">
                Accent
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-destructive rounded flex items-center justify-center text-destructive-foreground text-xs">
                Destructive
              </div>
              <div className="h-8 bg-success rounded flex items-center justify-center text-success-foreground text-xs">
                Success
              </div>
              <div className="h-8 bg-warning rounded flex items-center justify-center text-warning-foreground text-xs">
                Warning
              </div>
              <div className="h-8 bg-info rounded flex items-center justify-center text-info-foreground text-xs">
                Info
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Badge Test */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Badge Variants</Label>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
          </div>
        </div>

        <Separator />

        {/* Button Test */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Button Variants</Label>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm">Default</Button>
            <Button variant="secondary" size="sm">Secondary</Button>
            <Button variant="destructive" size="sm">Destructive</Button>
            <Button variant="outline" size="sm">Outline</Button>
            <Button variant="ghost" size="sm">Ghost</Button>
            <Button variant="link" size="sm">Link</Button>
          </div>
        </div>

        <Separator />

        {/* Form Elements Test */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Form Elements</Label>
          <div className="space-y-3">
            <div>
              <Label htmlFor="test-input">Test Input</Label>
              <Input id="test-input" placeholder="Enter some text..." />
            </div>
          </div>
        </div>

        <Separator />

        {/* Alert Test */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Alert Variants</Label>
          <div className="space-y-3">
            <Alert>
              <AlertDescription>
                This is a default alert message.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertDescription>
                This is a destructive alert message.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <Separator />

        {/* Chart Colors Test */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Chart Colors</Label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-12 rounded flex items-center justify-center text-white text-xs font-medium`}
                style={{ backgroundColor: `hsl(var(--chart-${i}))` }}
              >
                Chart {i}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Theme Icons */}
        <div className="flex items-center justify-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span className="text-xs">Light</span>
          </div>
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <span className="text-xs">Dark</span>
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="text-xs">System</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

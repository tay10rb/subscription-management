import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

/**
 * Border visibility test component for dark mode debugging
 * This component helps verify that borders are visible in both light and dark themes
 */
export function BorderTest() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Border Visibility Test</h2>
        <p className="text-muted-foreground mb-6">
          This component tests border visibility in both light and dark modes.
        </p>
      </div>

      {/* Card Grid Test */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Card 1</CardTitle>
            <CardDescription>This card should have visible borders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Content with border around the card.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Card 2</CardTitle>
            <CardDescription>Another card for comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">More content to test visibility.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Card 3</CardTitle>
            <CardDescription>Third card in the grid</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Final card for testing.</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Border Elements Test */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Border Elements</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Bordered Div</h4>
            <p className="text-sm text-muted-foreground">
              This div has a border class applied directly.
            </p>
          </div>

          <div className="border-2 rounded-lg p-4">
            <h4 className="font-medium mb-2">Thick Border Div</h4>
            <p className="text-sm text-muted-foreground">
              This div has a thicker border for better visibility.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Component Test */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Component Borders</h3>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">Outline Button</Button>
          <Badge variant="outline">Outline Badge</Badge>
        </div>
      </div>

      <Separator />

      {/* Color Test */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Border Colors</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-border rounded p-3 text-center text-sm">
            Default Border
          </div>
          <div className="border border-muted rounded p-3 text-center text-sm">
            Muted Border
          </div>
          <div className="border border-primary rounded p-3 text-center text-sm">
            Primary Border
          </div>
          <div className="border border-secondary rounded p-3 text-center text-sm">
            Secondary Border
          </div>
        </div>
      </div>

      {/* CSS Variables Display */}
      <Card>
        <CardHeader>
          <CardTitle>Current CSS Variables</CardTitle>
          <CardDescription>Border-related CSS variable values</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
            <div>
              <span className="text-muted-foreground">--border:</span>
              <div 
                className="mt-1 p-2 rounded border"
                style={{ backgroundColor: 'hsl(var(--border))' }}
              >
                hsl(var(--border))
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">--card:</span>
              <div 
                className="mt-1 p-2 rounded border"
                style={{ backgroundColor: 'hsl(var(--card))' }}
              >
                hsl(var(--card))
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">--background:</span>
              <div 
                className="mt-1 p-2 rounded border"
                style={{ backgroundColor: 'hsl(var(--background))' }}
              >
                hsl(var(--background))
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">--muted:</span>
              <div 
                className="mt-1 p-2 rounded border"
                style={{ backgroundColor: 'hsl(var(--muted))' }}
              >
                hsl(var(--muted))
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

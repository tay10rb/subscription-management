import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

type ConfigErrorProps = {
  title?: string
  description?: string
  details?: string
}

export function ConfigError({
  title = "Configuration Error",
  description = "There was an issue with the application configuration.",
  details
}: ConfigErrorProps) {
  return (
    <div className="container flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md border-destructive shadow-lg">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to connect to database</AlertTitle>
            <AlertDescription>
              Supabase configuration is missing or invalid. Please check your environment variables.
            </AlertDescription>
          </Alert>
          
          {details && (
            <div className="mt-4 bg-card p-4 rounded-md border text-xs font-mono overflow-auto">
              {details}
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="font-medium text-sm mb-2">Troubleshooting Steps:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Verify your .env file contains the correct Supabase credentials</li>
              <li>Restart the development server</li>
              <li>Check if your Supabase project is active and accessible</li>
              <li>Verify the browser console for additional error messages</li>
            </ol>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline">
            <Link to="/diagnostics">
              View System Diagnostics
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
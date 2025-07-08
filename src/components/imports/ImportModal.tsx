import { useState } from "react"
import { File, Upload, AlertTriangle, Check, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import { Subscription } from "@/store/subscriptionStore"
import { parseCSVToSubscriptions } from "@/lib/subscription-utils"

// Import data type - excludes auto-calculated fields
type SubscriptionImportData = Omit<Subscription, "id" | "lastBillingDate">

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (subscriptions: SubscriptionImportData[]) => void
}

enum ImportStep {
  Upload,
  Validate,
  Review,
  Complete
}

export function ImportModal({
  open,
  onOpenChange,
  onImport
}: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>(ImportStep.Upload)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [subscriptions, setSubscriptions] = useState<SubscriptionImportData[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Reset state when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep(ImportStep.Upload)
      setFile(null)
      setProgress(0)
      setSubscriptions([])
      setErrors([])
      setIsProcessing(false)
    }
    onOpenChange(open)
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setProgress(25)
      setTimeout(() => {
        setStep(ImportStep.Validate)
      }, 500)
    }
  }

  // Handle file validation
  const validateFile = () => {
    if (!file) return
    
    setIsProcessing(true)
    setProgress(50)
    
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const content = e.target?.result as string
      
      try {
        // Check file type based on extension
        if (file.name.endsWith('.csv')) {
          // Parse CSV file
          const result = parseCSVToSubscriptions(content)
          setSubscriptions(result.subscriptions)
          setErrors(result.errors)
        } else if (file.name.endsWith('.json')) {
          // Parse JSON file
          const data = JSON.parse(content)
          
          // Check if it's our storage format
          if (data.state?.subscriptions && Array.isArray(data.state.subscriptions)) {
            setSubscriptions(data.state.subscriptions.map((sub: any) => ({
              name: sub.name,
              plan: sub.plan,
              billingCycle: sub.billingCycle,
              nextBillingDate: sub.nextBillingDate,
              amount: sub.amount,
              currency: sub.currency,
              paymentMethodId: sub.paymentMethodId || 1,
              startDate: sub.startDate,
              status: sub.status,
              categoryId: sub.categoryId || 10,
              renewalType: sub.renewalType || 'manual',
              notes: sub.notes,
              website: sub.website,
            })))
          } else if (Array.isArray(data)) {
            // Check if it's a direct array of subscriptions
            if (data.length > 0 && 'name' in data[0] && 'amount' in data[0]) {
              setSubscriptions(data.map((sub: any) => ({
                name: sub.name || 'Unknown Subscription',
                plan: sub.plan || 'Basic',
                billingCycle: sub.billingCycle || 'monthly',
                nextBillingDate: sub.nextBillingDate || new Date().toISOString().split('T')[0],
                amount: Number(sub.amount) || 0,
                currency: sub.currency || 'USD',
                paymentMethodId: sub.paymentMethodId || 1,
                startDate: sub.startDate || new Date().toISOString().split('T')[0],
                status: sub.status || 'active',
                categoryId: sub.categoryId || 10,
                renewalType: sub.renewalType || 'manual',
                notes: sub.notes || '',
                website: sub.website || '',
              })))
            } else {
              setErrors(['Invalid JSON format. Expected an array of subscription objects.'])
            }
          } else if ('subscriptions' in data && Array.isArray(data.subscriptions)) {
            // Format with direct subscriptions property
            setSubscriptions(data.subscriptions.map((sub: any) => ({
              name: sub.name || 'Unknown Subscription',
              plan: sub.plan || 'Basic',
              billingCycle: sub.billingCycle || 'monthly',
              nextBillingDate: sub.nextBillingDate || new Date().toISOString().split('T')[0],
              amount: Number(sub.amount) || 0,
              currency: sub.currency || 'USD',
              paymentMethodId: sub.paymentMethodId || 1,
              startDate: sub.startDate || new Date().toISOString().split('T')[0],
              status: sub.status || 'active',
              categoryId: sub.categoryId || 10,
              renewalType: sub.renewalType || 'manual',
              notes: sub.notes || '',
              website: sub.website || '',
            })))
          } else {
            setErrors(['Invalid JSON format. Expected a subscription data structure.'])
          }
        } else {
          setErrors(['Unsupported file format. Please upload a CSV or JSON file.'])
        }
        
        setProgress(75)
        setIsProcessing(false)
        setStep(ImportStep.Review)
      } catch (error: any) {
        setErrors([`Error parsing file: ${error.message}`])
        setIsProcessing(false)
        setStep(ImportStep.Review)
      }
    }
    
    reader.onerror = () => {
      setErrors(['Error reading file.'])
      setIsProcessing(false)
      setStep(ImportStep.Review)
    }
    
    if (file.name.endsWith('.csv') || file.name.endsWith('.json')) {
      reader.readAsText(file)
    } else {
      setErrors(['Unsupported file format. Please upload a CSV or JSON file.'])
      setIsProcessing(false)
      setStep(ImportStep.Review)
    }
  }

  // Handle import completion
  const completeImport = () => {
    setProgress(100)
    onImport(subscriptions)
    setStep(ImportStep.Complete)
  }

  // Render content based on current step
  const renderStepContent = () => {
    switch (step) {
      case ImportStep.Upload:
        return (
          <div className="space-y-6 py-6">
            <div 
              className="border-2 border-dashed rounded-md p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <div className="space-y-2">
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">
                  CSV or JSON files up to 2MB
                </p>
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            
            <div className="bg-muted/50 rounded-md p-4 text-sm">
              <h4 className="font-medium mb-2">File requirements:</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>CSV files should have headers matching subscription fields</li>
                <li>Required fields: name, amount, currency, billingCycle, nextBillingDate, status</li>
                <li>JSON files should match the subscription data structure</li>
              </ul>
            </div>
          </div>
        )
      
      case ImportStep.Validate:
        return (
          <div className="space-y-6 py-10">
            <div className="flex items-center space-x-4">
              <File className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-1 flex-1">
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file?.size && (file.size / 1024).toFixed(1) + " KB") || "Unknown size"}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Validating file...</p>
                <p className="text-sm text-muted-foreground">{progress}%</p>
              </div>
              <Progress value={progress} />
            </div>
          </div>
        )
      
      case ImportStep.Review:
        return (
          <div className="space-y-6 py-4">
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Validation errors</AlertTitle>
                <AlertDescription>
                  {errors.length === 1 ? (
                    errors[0]
                  ) : (
                    <div className="mt-2">
                      <p className="mb-1">Found {errors.length} errors:</p>
                      <ScrollArea className="h-20 rounded border p-2">
                        <ul className="text-sm space-y-1">
                          {errors.map((error, index) => (
                            <li key={index} className="list-disc ml-4">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">Found {subscriptions.length} subscriptions</p>
                {subscriptions.length > 0 && errors.length === 0 && (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    <Check className="mr-1 h-3 w-3" /> Ready to import
                  </span>
                )}
              </div>
              
              {subscriptions.length > 0 && (
                <div className="border rounded-lg">
                  <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 text-sm font-medium">
                    <div>Name</div>
                    <div>Amount</div>
                    <div>Status</div>
                  </div>
                  <Separator />
                  <ScrollArea className="h-60">
                    <div className="p-1">
                      {subscriptions.map((subscription, index) => (
                        <div 
                          key={index} 
                          className="grid grid-cols-3 gap-2 p-2 text-sm hover:bg-muted/50 rounded-md"
                        >
                          <div className="font-medium">{subscription.name}</div>
                          <div>
                            {subscription.amount} {subscription.currency}
                          </div>
                          <div>
                            <span 
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                                ${subscription.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                                  subscription.status === 'trial' ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' :
                                  'bg-red-50 text-red-700 ring-red-600/20'} 
                                ring-1 ring-inset`}
                            >
                              {subscription.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
        )
      
      case ImportStep.Complete:
        return (
          <div className="py-12 text-center space-y-6">
            <div className="mx-auto rounded-full bg-green-100 p-3 w-16 h-16 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Import Completed</h3>
              <p className="text-muted-foreground">
                Successfully imported {subscriptions.length} subscriptions
              </p>
            </div>
          </div>
        )
    }
  }

  // Render footer buttons based on current step
  const renderFooterButtons = () => {
    switch (step) {
      case ImportStep.Upload:
        return (
          <>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              disabled={!file}
              onClick={() => file && setStep(ImportStep.Validate)}
            >
              Continue
            </Button>
          </>
        )
      
      case ImportStep.Validate:
        return (
          <>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              disabled={isProcessing}
              onClick={validateFile}
            >
              {isProcessing ? "Validating..." : "Validate File"}
            </Button>
          </>
        )
      
      case ImportStep.Review:
        return (
          <>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              disabled={subscriptions.length === 0 || errors.length > 0}
              onClick={completeImport}
            >
              Import {subscriptions.length} Subscriptions
            </Button>
          </>
        )
      
      case ImportStep.Complete:
        return (
          <Button onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Subscriptions</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file to import multiple subscriptions at once.
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="relative mb-2">
          <div className="overflow-hidden h-1 flex rounded bg-muted">
            <div
              style={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <div className={step >= ImportStep.Upload ? "text-primary font-medium" : ""}>
              Select file
            </div>
            <div className={step >= ImportStep.Validate ? "text-primary font-medium" : ""}>
              Validate
            </div>
            <div className={step >= ImportStep.Review ? "text-primary font-medium" : ""}>
              Review
            </div>
            <div className={step >= ImportStep.Complete ? "text-primary font-medium" : ""}>
              Complete
            </div>
          </div>
        </div>
        
        {renderStepContent()}
        
        <DialogFooter>
          {renderFooterButtons()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
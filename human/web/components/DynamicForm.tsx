'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { JSONSchema } from '@/types/task'

interface DynamicFormProps {
  schema: JSONSchema
  onSubmit: (data: any) => Promise<void>
  onCancel?: () => void
  defaultValues?: Record<string, any>
}

function jsonSchemaToZod(schema: JSONSchema): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {}

  Object.entries(schema.properties).forEach(([key, prop]) => {
    let zodType: z.ZodTypeAny

    switch (prop.type) {
      case 'string':
        zodType = z.string()
        if (prop.pattern) zodType = (zodType as z.ZodString).regex(new RegExp(prop.pattern))
        if (prop.enum) zodType = z.enum(prop.enum as [string, ...string[]])
        break

      case 'number':
        zodType = z.number()
        if (prop.minimum !== undefined) zodType = (zodType as z.ZodNumber).min(prop.minimum)
        if (prop.maximum !== undefined) zodType = (zodType as z.ZodNumber).max(prop.maximum)
        break

      case 'boolean':
        zodType = z.boolean()
        break

      case 'array':
        zodType = z.array(z.any())
        break

      case 'object':
        zodType = z.object({})
        break

      default:
        zodType = z.any()
    }

    // Make field optional if not in required array
    if (!schema.required?.includes(key)) {
      zodType = zodType.optional()
    }

    shape[key] = zodType
  })

  return z.object(shape)
}

export function DynamicForm({ schema, onSubmit, onCancel, defaultValues = {} }: DynamicFormProps) {
  const zodSchema = jsonSchemaToZod(schema)
  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues,
  })

  const handleSubmit = async (data: any) => {
    try {
      await onSubmit(data)
      form.reset()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const renderField = (key: string, prop: any) => {
    const isRequired = schema.required?.includes(key)

    // String with enum = Select
    if (prop.type === 'string' && prop.enum) {
      return (
        <FormField
          key={key}
          control={form.control}
          name={key}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {key} {isRequired && <span className="text-destructive">*</span>}
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${key}`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {prop.enum.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {prop.description && <FormDescription>{prop.description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }

    // Boolean = Switch
    if (prop.type === 'boolean') {
      return (
        <FormField
          key={key}
          control={form.control}
          name={key}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  {key} {isRequired && <span className="text-destructive">*</span>}
                </FormLabel>
                {prop.description && <FormDescription>{prop.description}</FormDescription>}
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      )
    }

    // Number = Input with type="number"
    if (prop.type === 'number') {
      return (
        <FormField
          key={key}
          control={form.control}
          name={key}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {key} {isRequired && <span className="text-destructive">*</span>}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={prop.default?.toString() || `Enter ${key}`}
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  min={prop.minimum}
                  max={prop.maximum}
                />
              </FormControl>
              {prop.description && <FormDescription>{prop.description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }

    // Long text = Textarea
    if (prop.type === 'string' && (prop.format === 'text' || key.toLowerCase().includes('description') || key.toLowerCase().includes('comment'))) {
      return (
        <FormField
          key={key}
          control={form.control}
          name={key}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {key} {isRequired && <span className="text-destructive">*</span>}
              </FormLabel>
              <FormControl>
                <Textarea placeholder={prop.default || `Enter ${key}`} {...field} rows={4} />
              </FormControl>
              {prop.description && <FormDescription>{prop.description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }

    // Default: String input
    return (
      <FormField
        key={key}
        control={form.control}
        name={key}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {key} {isRequired && <span className="text-destructive">*</span>}
            </FormLabel>
            <FormControl>
              <Input placeholder={prop.default || `Enter ${key}`} {...field} />
            </FormControl>
            {prop.description && <FormDescription>{prop.description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {Object.entries(schema.properties).map(([key, prop]) => renderField(key, prop))}

        <div className="flex gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}

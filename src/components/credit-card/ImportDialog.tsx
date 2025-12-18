import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { parseCSV, parseOFX, parseCSVRows, autoDetectMapping, generateFileHash, ColumnMapping, ParsedTransaction } from "@/lib/parsers";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ImportResult {
  success: boolean;
  importId: string;
  importedCount: number;
  duplicateCount: number;
  totalRecords: number;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  cardName: string;
  closingDay?: number;
  onImport: (data: {
    creditCardId: string;
    transactions: ParsedTransaction[];
    fileName: string;
    fileHash: string;
    fileType: 'csv' | 'ofx';
    closingDay?: number;
  }) => Promise<ImportResult>;
  isImporting: boolean;
}

type Step = 'upload' | 'mapping' | 'preview' | 'success';

export function ImportDialog({ 
  open, 
  onOpenChange, 
  cardId, 
  cardName, 
  closingDay,
  onImport,
  isImporting 
}: ImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileType, setFileType] = useState<'csv' | 'ofx'>('csv');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: 0, description: 1, amount: 2 });
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number } | null>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setFileContent('');
    setCsvHeaders([]);
    setTransactions([]);
    setImportResult(null);
  }, []);

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const content = await selectedFile.text();
    setFile(selectedFile);
    setFileContent(content);

    const isOFX = selectedFile.name.toLowerCase().endsWith('.ofx') || 
                  content.includes('<OFX>') || 
                  content.includes('OFXHEADER');
    
    if (isOFX) {
      setFileType('ofx');
      const parsed = parseOFX(content);
      setTransactions(parsed);
      setStep('preview');
    } else {
      setFileType('csv');
      const rows = parseCSVRows(content);
      if (rows.length > 0) {
        setCsvHeaders(rows[0]);
        const autoMapping = autoDetectMapping(rows[0]);
        if (autoMapping) {
          setMapping(autoMapping);
        }
        setStep('mapping');
      }
    }
  };

  const handleMappingComplete = () => {
    const parsed = parseCSV(fileContent, mapping, true);
    setTransactions(parsed);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!file || transactions.length === 0) return;

    try {
      const hash = await generateFileHash(fileContent);
      await onImport({
        creditCardId: cardId,
        transactions,
        fileName: file.name,
        fileHash: hash,
        fileType,
        closingDay,
      });
      setImportResult({
        imported: transactions.length,
        duplicates: 0,
      });
      setStep('success');
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Importar Extrato - {cardName}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Selecione um arquivo CSV ou OFX para importar'}
            {step === 'mapping' && 'Mapeie as colunas do seu arquivo'}
            {step === 'preview' && 'Revise as transações antes de importar'}
            {step === 'success' && 'Importação concluída com sucesso'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12">
              <label className="cursor-pointer">
                <div className={cn(
                  "flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-dashed",
                  "border-muted-foreground/25 hover:border-primary/50 transition-colors"
                )}>
                  <div className="p-4 rounded-full bg-primary/10">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">Clique para selecionar</p>
                    <p className="text-sm text-muted-foreground">ou arraste um arquivo CSV/OFX</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".csv,.ofx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          )}

          {/* Mapping Step (CSV only) */}
          {step === 'mapping' && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Colunas detectadas: {csvHeaders.length}
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Coluna de Data</Label>
                    <Select 
                      value={mapping.date.toString()} 
                      onValueChange={(v) => setMapping({ ...mapping, date: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map((header, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>
                            {header || `Coluna ${idx + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Coluna de Descrição</Label>
                    <Select 
                      value={mapping.description.toString()} 
                      onValueChange={(v) => setMapping({ ...mapping, description: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map((header, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>
                            {header || `Coluna ${idx + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Coluna de Valor</Label>
                    <Select 
                      value={mapping.amount.toString()} 
                      onValueChange={(v) => setMapping({ ...mapping, amount: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map((header, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>
                            {header || `Coluna ${idx + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div className="space-y-4 py-4 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{transactions.length} transações</Badge>
                  <Badge variant="secondary">Total: {formatCurrency(totalAmount)}</Badge>
                </div>
                {file && (
                  <span className="text-sm text-muted-foreground">{file.name}</span>
                )}
              </div>
              
              <div className="flex-1 overflow-auto max-h-[300px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 50).map((tx, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">
                          {new Date(tx.date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {tx.description}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-destructive">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {transactions.length > 50 && (
                <p className="text-xs text-muted-foreground text-center">
                  Mostrando 50 de {transactions.length} transações
                </p>
              )}
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">
                Importação Concluída!
              </h3>
              <p className="text-muted-foreground">
                As transações foram importadas com sucesso.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
          )}
          
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button onClick={handleMappingComplete}>
                Continuar
              </Button>
            </>
          )}
          
          {step === 'preview' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep(fileType === 'csv' ? 'mapping' : 'upload')}
              >
                Voltar
              </Button>
              <Button 
                onClick={handleImport}
                disabled={isImporting || transactions.length === 0}
              >
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar {transactions.length} transações
              </Button>
            </>
          )}
          
          {step === 'success' && (
            <Button onClick={() => handleClose(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

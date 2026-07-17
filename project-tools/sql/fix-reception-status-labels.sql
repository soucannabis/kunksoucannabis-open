-- Corrige receptions criadas com label "Espera" em vez do value estável "waiting".
UPDATE reception
SET status = 'waiting'
WHERE status IN ('Espera', 'espera');

UPDATE reception
SET status = 'done'
WHERE status IN ('Concluído', 'Concluido', 'concluído', 'concluido');

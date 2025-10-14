-- Inserir template padrão de etiqueta
INSERT INTO label_templates 
  (id, name, width, height, "isDefault", "isActive", elements, "municipalityId", "createdBy", "createdAt", "updatedAt")
VALUES 
  (
    'default-60x40',
    'Padrão 60x40mm',
    60,
    40,
    true,
    true,
    '[
      {
        "id": "logo",
        "type": "LOGO",
        "x": 5,
        "y": 5,
        "width": 25,
        "height": 20,
        "content": "logo",
        "fontSize": 12,
        "fontWeight": "normal",
        "textAlign": "left"
      },
      {
        "id": "patrimonio",
        "type": "PATRIMONIO_FIELD",
        "content": "numero_patrimonio",
        "x": 5,
        "y": 70,
        "width": 55,
        "height": 25,
        "fontSize": 16,
        "fontWeight": "bold",
        "textAlign": "left"
      }
    ]'::jsonb,
    'municipality-1',
    'user-supervisor-ssbv',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;

-- Verificar inserção
SELECT id, name, width, height, "isDefault" FROM label_templates;


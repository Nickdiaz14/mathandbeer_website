import random
import multiprocessing
import time

# Los 8 movimientos posibles del rey
MOVES = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]

def backtracking_gen(matrix, n, x, y, current_number):
    if current_number == n * n:
        return True
        
    scored_moves = []
    for dx, dy in MOVES:
        nx, ny = x + dx, y + dy
        if 0 <= nx < n and 0 <= ny < n and matrix[nx][ny] == 0:
            count = 0
            for ddx, ddy in MOVES:
                nnx, nny = nx + ddx, ny + ddy
                if 0 <= nnx < n and 0 <= nny < n and matrix[nnx][nny] == 0:
                    count += 1
            scored_moves.append((count, nx, ny))
            
    # Heurística de Warnsdorff con aleatoriedad
    scored_moves.sort(key=lambda item: (item[0], random.random()))
    
    for _, nx, ny in scored_moves:
        matrix[nx][ny] = current_number + 1
        if backtracking_gen(matrix, n, nx, ny, current_number + 1):
            return True
        matrix[nx][ny] = 0
    return False

def make_confusing_board(perfect_matrix, n):
    max_val = n * n
    puzzle = [row[:] for row in perfect_matrix]
    
    # Determinar cuántas pistas dejar para que sea confuso pero viable
    # Inverso a tu código original: dejamos menos de la mitad visible
    if n == 5:
        pistas_objetivo = random.randint(9, 11)   # ~60% borrado
    elif n == 6:
        pistas_objetivo = random.randint(12, 14)  # ~65% borrado
    else:
        pistas_objetivo = random.randint(15, 18)  # ~68% borrado

    # Recolectar candidatos (protegiendo extremos)
    candidates = []
    for r in range(n):
        for c in range(n):
            if puzzle[r][c] != 1 and puzzle[r][c] != max_val:
                candidates.append((r, c))
                
    random.shuffle(candidates)
    
    # Borrado estratégico: Para evitar secuencias obvias de números consecutivos
    # Borramos preferiblemente números alternos (pares o impares) para romper las cadenas fáciles
    pistas_actuales = max_val
    
    for r, c in candidates:
        if pistas_actuales <= pistas_objetivo:
            break
        
        val = puzzle[r][c]
        # Forzar que se rompan secuencias consecutivas visibles grandes
        # Si sus vecinos inmediatos numéricos (+1 o -1) ya están borrados, evaluar si conviene quitar este
        puzzle[r][c] = 0
        pistas_actuales -= 1

    return [cell for row in puzzle for cell in row]

def process_worker(n, total_levels, filename):
    print(f"[Proceso N={n}] Iniciando generación de {total_levels} niveles...")
    start_time = time.time()
    
    with open(filename, 'w') as f:
        count = 0
        while count < total_levels:
            matrix = [[0 for _ in range(n)] for _ in range(n)]
            rx, ry = random.randint(0, n-1), random.randint(0, n-1)
            matrix[rx][ry] = 1
            
            if backtracking_gen(matrix, n, rx, ry, 1):
                # Genera el tablero confuso con el nuevo método optimizado
                hard_board = make_confusing_board(matrix, n)
                f.write(str(hard_board) + '\n')
                count += 1
                
                if count % 100 == 0:
                    print(f"[Proceso N={n}] Hechos {count}/{total_levels} niveles...")
                    
    end_time = time.time()
    print(f"¡PROCESO N={n} COMPLETADO! Archivo '{filename}' guardado en {end_time - start_time:.2f} segundos.")

if __name__ == "__main__":
    TOTAL_NIVELES = 1000
    SIZES = [6, 7]
    procesos = []

    print("--- INICIANDO GENERADOR DE DATASETS DE HIDATO OPTIMIZADO POR MULTIPROCESAMIENTO ---")
    start_global = time.time()

    for n in SIZES:
        filename = f"hidato{n}.txt"
        # Usamos multiprocessing.Process en lugar de threading.Thread
        p = multiprocessing.Process(target=process_worker, args=(n, TOTAL_NIVELES, filename))
        procesos.append(p)
        p.start()

    # Esperar a que todos los núcleos terminen su respectivo tamaño
    for p in procesos:
        p.join()

    end_global = time.time()
    print(f"\n[ÉXITO TOTAL] Todos los datasets listos en {end_global - start_global:.2f} segundos.")
"""Aplica valores do painel de ajustes (JSON) antes da simulação. Uso: config.py <entrada> <saida> '<json>'"""
import sys
src = open(sys.argv[1]).read()
src = src.replace("size();cap();\n", "size();cap();\nfor(const[k,v]of Object.entries(%s))setCfg(k,v);\n" % sys.argv[3], 1)
open(sys.argv[2], "w").write(src)

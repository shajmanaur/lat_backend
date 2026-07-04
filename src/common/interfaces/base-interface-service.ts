export interface IBaseService<TCreateDto, TUpdateDto, TEntity> {
  create(obj: TCreateDto, uid?: number): Promise<TEntity>;
  findAll(): Promise<TEntity[]>;
  findOne(id: number): Promise<TEntity | null>;
  update(id: number, dto: TUpdateDto, uid?: number): Promise<TEntity | null>;
  remove(id: number, uid?: number): Promise<TEntity | null>;
}
